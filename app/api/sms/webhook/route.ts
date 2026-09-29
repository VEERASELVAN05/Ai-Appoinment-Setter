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
      };
    } else {
      try {
        payload = await request.json();
      } catch {
        payload = {};
      }
    }

    const toNumber = payload.To;

    const smsData = {
      messageId: payload.MessageSid || `sms_${Date.now()}`,
      from: payload.From,
      to: toNumber,
      text: payload.Body,
      channel: 'sms' as const,
      provider: 'twilio',
      direction: 'inbound' as const,
      status: 'received',
      createdAt: new Date().toISOString(),
      tenantId: await getTenantFromPhoneNumber(toNumber),
    };

    const tenantId = await getTenantFromPhoneNumber(toNumber);
    
    // Store incoming SMS in Firestore
    await db.collection('messages').add(smsData);

    // Get tenant configuration for AI
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.exists ? tenantDoc.data() : {};
    const aiConfig = tenantData?.aiConfig || {};
    const assistantName = aiConfig.assistantName || 'Riley';

    // Process message with AI using unified processor
    const { aiResponse, appointmentData } = await processMessageWithAI(
      payload.Body,
      tenantId,
      smsData.from,
      assistantName,
      'sms'
    );

    // Save AI response to Firestore
    const responseData = {
      messageId: `sms_${Date.now()}_response`,
      from: toNumber,
      to: payload.From,
      text: aiResponse,
      channel: 'sms' as const,
      provider: 'twilio',
      direction: 'outbound' as const,
      status: 'pending',
      createdAt: new Date().toISOString(),
      tenantId,
      appointmentCreated: !!appointmentData
    };

    await db.collection('messages').add(responseData);

    // Send SMS response via Twilio
    await sendSMSResponse(payload.From, toNumber, aiResponse);

    return NextResponse.json({ success: true, message: 'SMS processed and response sent' });
  } catch (error) {
    console.error('SMS webhook error:', error);
    return NextResponse.json({ error: 'Failed to process SMS' }, { status: 500 });
  }
}

async function getTenantFromPhoneNumber(phoneNumber: string): Promise<string> {
  try {
    // Try to find tenant by SMS phone number (new structure)
    let tenantsSnapshot = await db.collection('tenants')
      .where('channels.sms.twilioPhoneNumber', '==', phoneNumber)
      .get();
    
    if (!tenantsSnapshot.empty) {
      return tenantsSnapshot.docs[0].id;
    }

    // Fallback to old structure for backwards compatibility
    tenantsSnapshot = await db.collection('tenants')
      .where('settings.phoneNumber', '==', phoneNumber)
      .get();
    
    if (!tenantsSnapshot.empty) {
      return tenantsSnapshot.docs[0].id;
    }
    
    return 't_demo'; // fallback
  } catch (error) {
    console.error('Error finding tenant:', error);
    return 't_demo';
  }
}


async function sendSMSResponse(toNumber: string, fromNumber: string, message: string) {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!twilioAccountSid || !twilioAuthToken) {
    console.log('Twilio credentials not configured, skipping SMS send');
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
      console.error('Twilio SMS send error:', errorText);
    } else {
      console.log('SMS sent successfully to', toNumber);
    }
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
  }
}
