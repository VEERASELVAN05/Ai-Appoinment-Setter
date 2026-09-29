import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const workflowType = searchParams.get('type') || 'general';

    console.log(`N8N webhook (${workflowType}):`, JSON.stringify(body, null, 2));

    switch (workflowType) {
      case 'appointment':
        return await handleAppointmentCreated(body);
      case 'call-analysis':
        return await handleCallAnalysis(body);
      case 'sms-response':
        return await handleSmsResponse(body);
      case 'whatsapp-response':
        return await handleWhatsAppResponse(body);
      default:
        return await handleGeneral(body);
    }
  } catch (error) {
    console.error('N8N webhook error:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}

async function handleAppointmentCreated(data: any) {
  try {
    // When n8n successfully creates a Google Calendar event
    const appointmentData = {
      tenantId: data.tenantId || 't_demo',
      title: data.title || data.summary,
      start: data.start?.dateTime || data.startTime,
      end: data.end?.dateTime || data.endTime,
      attendee: data.attendees?.[0]?.email || data.attendeeEmail,
      eventId: data.eventId || data.id,
      htmlLink: data.htmlLink,
      calendarId: data.calendarId,
      createdAt: new Date().toISOString(),
      source: 'n8n_workflow',
      status: 'confirmed',
      callId: data.callId, // Link back to the call that created this
    };

    const docRef = await db.collection('appointments').add(appointmentData);
    
    console.log('Appointment saved from n8n:', docRef.id);
    
    return NextResponse.json({ 
      success: true, 
      appointmentId: docRef.id,
      message: 'Appointment saved successfully'
    });
  } catch (error) {
    console.error('Failed to save appointment from n8n:', error);
    return NextResponse.json({ error: 'Failed to save appointment' }, { status: 500 });
  }
}

async function handleCallAnalysis(data: any) {
  try {
    // When n8n processes call data and extracts insights
    const callId = data.callId;
    const analysis = {
      sentiment: data.sentiment,
      intent: data.intent,
      keywords: data.keywords,
      summary: data.summary,
      actionItems: data.actionItems,
      followUpRequired: data.followUpRequired,
      analyzedAt: new Date().toISOString(),
    };

    // Update the existing call record
    const callQuery = await db.collection('calls').where('callId', '==', callId).limit(1).get();
    
    if (!callQuery.empty) {
      await callQuery.docs[0].ref.update({
        analysis,
        updatedAt: new Date().toISOString(),
      });
      
      console.log('Call analysis updated:', callId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save call analysis:', error);
    return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
  }
}

async function handleSmsResponse(data: any) {
  try {
    // When n8n sends an SMS response
    const messageData = {
      messageId: data.messageId || `sms_out_${Date.now()}`,
      tenantId: data.tenantId,
      from: data.from, // Business phone number
      to: data.to,     // Customer phone number
      text: data.text || data.message,
      channel: 'sms',
      provider: data.provider || 'twilio',
      direction: 'outbound',
      status: data.status || 'sent',
      createdAt: new Date().toISOString(),
      source: 'n8n_workflow',
      replyToMessageId: data.replyToMessageId,
    };

    await db.collection('messages').add(messageData);
    
    console.log('SMS response logged:', messageData.messageId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log SMS response:', error);
    return NextResponse.json({ error: 'Failed to log SMS' }, { status: 500 });
  }
}

async function handleWhatsAppResponse(data: any) {
  try {
    // When n8n sends a WhatsApp response
    const messageData = {
      messageId: data.messageId || `wa_out_${Date.now()}`,
      tenantId: data.tenantId,
      from: data.from, // Business WhatsApp number
      to: data.to,     // Customer WhatsApp number
      text: data.text || data.message,
      channel: 'whatsapp',
      provider: 'meta',
      direction: 'outbound',
      status: data.status || 'sent',
      createdAt: new Date().toISOString(),
      source: 'n8n_workflow',
      replyToMessageId: data.replyToMessageId,
    };

    await db.collection('messages').add(messageData);
    
    console.log('WhatsApp response logged:', messageData.messageId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log WhatsApp response:', error);
    return NextResponse.json({ error: 'Failed to log WhatsApp' }, { status: 500 });
  }
}

async function handleGeneral(data: any) {
  // Handle any other n8n workflow data
  console.log('General n8n webhook data received:', data);
  
  return NextResponse.json({ 
    success: true, 
    message: 'Webhook received successfully' 
  });
}

// GET endpoint for n8n webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ status: 'N8N webhook endpoint active' });
}
