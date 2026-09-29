import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { processMessageWithAI } from '@/lib/message-processor';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log('Facebook webhook received:', JSON.stringify(payload, null, 2));

    // Handle verification challenge
    if (payload.object === 'page') {
      for (const entry of payload.entry) {
        for (const event of entry.messaging) {
          if (event.message && !event.message.is_echo) {
            await processFacebookMessage(event, entry.id);
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Facebook webhook error:', error);
    return NextResponse.json({ error: 'Failed to process Facebook message' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Handle Facebook webhook verification
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge);
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

async function processFacebookMessage(event: any, pageId: string) {
  const message = event.message;
  const senderId = event.sender.id;
  const messageText = message.text || '';
  const messageId = message.mid;

  // Get tenant from Facebook page ID
  const tenantId = await getTenantFromFacebookPage(pageId);
  
  const facebookData = {
    messageId: messageId,
    from: senderId,
    to: pageId,
    text: messageText,
    channel: 'facebook' as const,
    provider: 'facebook',
    direction: 'inbound' as const,
    status: 'received',
    createdAt: new Date().toISOString(),
    tenantId,
  };

  // Store incoming Facebook message in Firestore
  await db.collection('messages').add(facebookData);

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
    'facebook'
  );

  // Save AI response to Firestore
  const responseData = {
    messageId: `facebook_${Date.now()}_response`,
    from: pageId,
    to: senderId,
    text: aiResponse,
    channel: 'facebook' as const,
    provider: 'facebook',
    direction: 'outbound' as const,
    status: 'pending',
    createdAt: new Date().toISOString(),
    tenantId,
    appointmentCreated: !!appointmentData
  };

  await db.collection('messages').add(responseData);

  // Send Facebook response
  await sendFacebookResponse(senderId, aiResponse, tenantId);
}

async function getTenantFromFacebookPage(pageId: string): Promise<string> {
  try {
    // Try to find tenant by Facebook page ID
    let tenantsSnapshot = await db.collection('tenants')
      .where('channels.facebook.pageId', '==', pageId)
      .get();
    
    if (!tenantsSnapshot.empty) {
      return tenantsSnapshot.docs[0].id;
    }
    
    return 't_demo'; // fallback
  } catch (error) {
    console.error('Error finding tenant for Facebook:', error);
    return 't_demo';
  }
}


async function sendFacebookResponse(recipientId: string, message: string, tenantId: string) {
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  
  if (!pageAccessToken) {
    console.log('Facebook Page Access Token not configured, skipping Facebook send');
    return;
  }
  
  try {
    const facebookUrl = `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`;
    
    const response = await fetch(facebookUrl, {
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
      console.error('Facebook send error:', errorText);
    } else {
      console.log('Facebook message sent successfully to', recipientId);
    }
  } catch (error) {
    console.error('Error sending Facebook message:', error);
  }
}
