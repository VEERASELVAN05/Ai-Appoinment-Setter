import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Vapi webhook received:', JSON.stringify(body, null, 2));

    // Handle different Vapi event types
    const eventType = body.message?.type || body.type;

    switch (eventType) {
      case 'call-started':
        await handleCallStarted(body);
        break;
      case 'call-ended':
        await handleCallEnded(body);
        break;
      case 'function-call':
        return await handleFunctionCall(body);
      case 'transcript':
        await handleTranscript(body);
        break;
      default:
        console.log('Unknown Vapi event type:', eventType);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vapi webhook error:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}

async function handleCallStarted(data: any) {
  const callData = {
    callId: data.message?.call?.id || data.call?.id,
    tenantId: await getTenantFromPhoneNumber(data.message?.call?.customer?.number),
    eventType: 'call.started',
    from: data.message?.call?.customer?.number,
    to: data.message?.call?.phoneNumber?.number,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    vapiData: data,
  };

  await db.collection('calls').add(callData);
  console.log('Call started logged:', callData.callId);
}

async function handleCallEnded(data: any) {
  const call = data.message?.call || data.call;
  
  const callData = {
    callId: call?.id,
    tenantId: await getTenantFromPhoneNumber(call?.customer?.number),
    eventType: 'call.ended',
    from: call?.customer?.number,
    to: call?.phoneNumber?.number,
    status: call?.status || 'completed',
    duration: call?.duration,
    cost: call?.cost,
    recordingUrl: call?.recordingUrl,
    transcript: call?.transcript,
    summary: call?.summary,
    createdAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    vapiData: data,
  };

  await db.collection('calls').add(callData);
  console.log('Call ended logged:', callData.callId);

  // Trigger n8n workflow for post-call processing
  const n8nWebhookUrl = process.env.N8N_CALL_ENDED_WEBHOOK_URL || 'https://n8n-o5ea.onrender.com/webhook/call-ended';
  
  try {
    await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callData),
    });
  } catch (n8nError) {
    console.error('Failed to trigger n8n workflow:', n8nError);
  }
}

async function handleFunctionCall(data: any) {
  const functionCall = data.message?.functionCall;
  
  if (functionCall?.name === 'createCalendarEvent') {
    // Handle appointment booking
    const params = functionCall.parameters;
    
    try {
      // Create appointment in our database
      const appointmentData = {
        tenantId: await getTenantFromPhoneNumber(data.message?.call?.customer?.number),
        callId: data.message?.call?.id,
        title: params.title || 'Appointment',
        start: params.start,
        end: params.end,
        attendee: params.attendeeEmail,
        customerPhone: data.message?.call?.customer?.number,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        source: 'vapi_call',
      };

      const docRef = await db.collection('appointments').add(appointmentData);
      
      // Return success response to Vapi
      return NextResponse.json({
        result: {
          success: true,
          appointmentId: docRef.id,
          message: `Appointment scheduled for ${new Date(params.start).toLocaleString()}`
        }
      });
    } catch (error) {
      console.error('Failed to create appointment:', error);
      return NextResponse.json({
        result: {
          success: false,
          error: 'Failed to schedule appointment. Please try again.'
        }
      });
    }
  }

  // Return default response for unknown functions
  return NextResponse.json({
    result: {
      success: false,
      error: 'Unknown function call'
    }
  });
}

async function handleTranscript(data: any) {
  const transcript = data.message?.transcript;
  
  if (transcript) {
    // Update call with transcript
    const callId = data.message?.call?.id;
    
    try {
      const callQuery = await db.collection('calls').where('callId', '==', callId).limit(1).get();
      
      if (!callQuery.empty) {
        const callDoc = callQuery.docs[0];
        await callDoc.ref.update({
          transcript: transcript.text,
          transcriptRole: transcript.role,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to update transcript:', error);
    }
  }
}

async function getTenantFromPhoneNumber(phoneNumber: string): Promise<string> {
  // In a real system, you'd have a mapping table
  // For now, return a default tenant for demo purposes
  
  try {
    // Query settings or tenants collection for phone number mapping
    const tenantsQuery = await db.collection('tenants')
      .where('phoneNumber', '==', phoneNumber)
      .limit(1)
      .get();
    
    if (!tenantsQuery.empty) {
      return tenantsQuery.docs[0].data().tenantId;
    }
  } catch (error) {
    console.error('Error looking up tenant:', error);
  }

  // Default tenant for demo
  return 't_demo';
}
