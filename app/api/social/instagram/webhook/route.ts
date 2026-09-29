import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { processMessageWithAI } from '@/lib/message-processor';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log('Instagram webhook received:', JSON.stringify(payload, null, 2));

    // Handle Instagram webhook events
    for (const entry of payload) {
      if (entry.object === 'instagram') {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            for (const message of change.value.messages) {
              await processInstagramMessage(message, change.value.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Instagram webhook error:', error);
    return NextResponse.json({ error: 'Failed to process Instagram message' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Handle Instagram webhook verification
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return new NextResponse(challenge);
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

async function processInstagramMessage(message: any, pageId: string) {
  const senderId = message.from.id;
  const messageText = message.text || '';
  const messageId = message.id;
  const timestamp = message.timestamp;

  // Get tenant from Instagram page ID
  const tenantId = await getTenantFromInstagramPage(pageId);
  
  const instagramData = {
    messageId: messageId,
    from: senderId,
    to: pageId,
    text: messageText,
    channel: 'instagram' as const,
    provider: 'instagram',
    direction: 'inbound' as const,
    status: 'received',
    createdAt: new Date(parseInt(timestamp) * 1000).toISOString(),
    tenantId,
  };

  // Store incoming Instagram message in Firestore
  await db.collection('messages').add(instagramData);

  // Get tenant configuration for AI
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  const tenantData = tenantDoc.exists ? tenantDoc.data() : {};
  const aiConfig = tenantData?.aiConfig || {};
  const assistantName = aiConfig.assistantName || 'Riley';

  // Process message with AI using unified processor
  const { aiResponse, appointmentData } = await processMessageWithAI(
    messageText,
    tenantId,
    senderId,
    assistantName,
    'instagram'
  );

  // Save AI response to Firestore
  const responseData = {
    messageId: `instagram_${Date.now()}_response`,
    from: pageId,
    to: senderId,
    text: aiResponse,
    channel: 'instagram' as const,
    provider: 'instagram',
    direction: 'outbound' as const,
    status: 'pending',
    createdAt: new Date().toISOString(),
    tenantId,
    appointmentCreated: !!appointmentData
  };

  await db.collection('messages').add(responseData);

  // Send Instagram response
  await sendInstagramResponse(senderId, aiResponse, tenantId);
}

async function getTenantFromInstagramPage(pageId: string): Promise<string> {
  try {
    // Try to find tenant by Instagram page ID
    let tenantsSnapshot = await db.collection('tenants')
      .where('channels.instagram.pageId', '==', pageId)
      .get();
    
    if (!tenantsSnapshot.empty) {
      return tenantsSnapshot.docs[0].id;
    }
    
    return 't_demo'; // fallback
  } catch (error) {
    console.error('Error finding tenant for Instagram:', error);
    return 't_demo';
  }
}


async function sendInstagramResponse(recipientId: string, message: string, tenantId: string) {
  const pageAccessToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  
  if (!pageAccessToken) {
    console.log('Instagram Page Access Token not configured, skipping Instagram send');
    return;
  }
  
  try {
    const instagramUrl = `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`;
    
    const response = await fetch(instagramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Instagram send error:', errorText);
    } else {
      console.log('Instagram message sent successfully to', recipientId);
    }
  } catch (error) {
    console.error('Error sending Instagram message:', error);
  }
}
