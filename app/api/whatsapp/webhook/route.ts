import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { processMessageWithAI } from '@/lib/message-processor';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let payload: any = {};
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const textBody = await request.text();
      const params = new URLSearchParams(textBody);
      payload = {
        MessageSid: params.get('MessageSid') || '',
        From: params.get('From') || '',
        To: params.get('To') || '',
        Body: params.get('Body') || '',
        NumMedia: params.get('NumMedia') || '0',
      };
    } else {
      try {
        payload = await request.json();
      } catch {
        payload = {};
      }
    }

    const toNumber = payload.To;
    const fromNumber = payload.From;

    const whatsappData = {
      messageId: payload.MessageSid || `whatsapp_${Date.now()}`,
      from: fromNumber,
      to: toNumber,
      text: payload.Body,
      channel: 'whatsapp' as const,
      provider: 'twilio',
      direction: 'inbound' as const,
      status: 'received',
      createdAt: new Date().toISOString(),
      tenantId: await getTenantFromWhatsAppNumber(toNumber),
    };

    const tenantId = whatsappData.tenantId;
    
    // Store incoming WhatsApp message in Firestore
    await db.collection('messages').add(whatsappData);

    // Get tenant configuration for AI
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.exists ? tenantDoc.data() : {};
    const aiConfig = tenantData?.aiConfig || {};
    const assistantName = aiConfig.assistantName || 'Riley';

    // Process message with AI using unified processor
    const { aiResponse, appointmentData } = await processMessageWithAI(
      payload.Body,
      tenantId,
      fromNumber,
      assistantName,
      'whatsapp'
    );

    // Save AI response to Firestore
    const responseData = {
      messageId: `whatsapp_${Date.now()}_response`,
      from: toNumber,
      to: fromNumber,
      text: aiResponse,
      channel: 'whatsapp' as const,
      provider: 'twilio',
      direction: 'outbound' as const,
      status: 'pending',
      createdAt: new Date().toISOString(),
      tenantId,
      appointmentCreated: !!appointmentData
    };

    await db.collection('messages').add(responseData);

    // Send WhatsApp response via Twilio
    await sendWhatsAppResponse(fromNumber, toNumber, aiResponse);

    return NextResponse.json({ success: true, message: 'WhatsApp processed and response sent' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ error: 'Failed to process WhatsApp message' }, { status: 500 });
  }
}

async function getTenantFromWhatsAppNumber(phoneNumber: string): Promise<string> {
  try {
    // Try to find tenant by WhatsApp phone number
    let tenantsSnapshot = await db.collection('tenants')
      .where('channels.whatsapp.twilioPhoneNumber', '==', phoneNumber)
      .get();
    
    if (!tenantsSnapshot.empty) {
      return tenantsSnapshot.docs[0].id;
    }

    // Fallback to checking if it's the same as SMS number
    tenantsSnapshot = await db.collection('tenants')
      .where('channels.sms.twilioPhoneNumber', '==', phoneNumber.replace('whatsapp:', ''))
      .get();
    
    if (!tenantsSnapshot.empty) {
      return tenantsSnapshot.docs[0].id;
    }
    
    return 't_demo'; // fallback
  } catch (error) {
    console.error('Error finding tenant for WhatsApp:', error);
    return 't_demo';
  }
}


async function sendWhatsAppResponse(toNumber: string, fromNumber: string, message: string) {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!twilioAccountSid || !twilioAuthToken) {
    console.log('Twilio credentials not configured, skipping WhatsApp send');
    return;
  }
  
  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: toNumber,
        Body: message
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio WhatsApp send error:', errorText);
    } else {
      console.log('WhatsApp message sent successfully to', toNumber);
    }
  } catch (error) {
    console.error('Error sending WhatsApp via Twilio:', error);
  }
}
