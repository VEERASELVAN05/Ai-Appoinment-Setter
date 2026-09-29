import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { processMessageWithAI, getTenantConfig } from '@/lib/message-processor';

function parseMonth(monthStr: string): number {
  const months: { [key: string]: number } = {
    'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
    'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5, 'jul': 6, 'july': 6,
    'aug': 7, 'august': 7, 'sep': 8, 'september': 8, 'oct': 9, 'october': 9,
    'nov': 10, 'november': 10, 'dec': 11, 'december': 11
  };
  return months[monthStr.toLowerCase()] ?? -1;
}

function parseDateTime(message: string): { date: Date | null, hasDate: boolean, hasTime: boolean } {
  const text = message.toLowerCase();
  let date = new Date();
  let hasDate = false;
  let hasTime = false;
  
  // Tomorrow
  if (text.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
    hasDate = true;
  }
  
  // Month and day patterns
  const monthDay = text.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i) ||
                  text.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i) ||
                  text.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) ||
                  text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i);
  
  if (monthDay) {
    let day, monthStr;
    if (isNaN(parseInt(monthDay[1]))) {
      monthStr = monthDay[1];
      day = parseInt(monthDay[2]);
    } else {
      day = parseInt(monthDay[1]);
      monthStr = monthDay[2];
    }
    
    const month = parseMonth(monthStr);
    if (month !== -1) {
      date.setMonth(month);
      date.setDate(day);
      hasDate = true;
    }
  }
  
  // Time patterns
  const timeMatch = text.match(/(\d{1,2})\s*(pm|am)/i) || text.match(/(\d{1,2}):(\d{2})\s*(pm|am)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] && !isNaN(parseInt(timeMatch[2])) ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3] || timeMatch[2];
    
    if (ampm && ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12;
    if (ampm && ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
    
    date.setHours(hours, minutes, 0, 0);
    hasTime = true;
  }
  
  return { date: hasDate || hasTime ? date : null, hasDate, hasTime };
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, conversationId, message, channel = 'webchat' } = await request.json();

    if (!tenantId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get tenant configuration using unified function
    const { assistantName, systemPrompt, tenantData } = await getTenantConfig(tenantId);

    // Save user message
    await db.collection('messages').add({
      tenantId,
      conversationId: conversationId || `conv_${Date.now()}`,
      channel: channel || 'webchat',
      direction: 'inbound',
      from: 'customer',
      to: assistantName,
      content: message,
      createdAt: new Date().toISOString(),
      handedOffToHuman: false
    });

    // Get context
    let contextEmail = '';
    let messages: Array<{role: string; content: string}> = [];
    
    try {
      const convDoc = await db.collection('conversations').doc(conversationId || `conv_${Date.now()}`).get();
      if (convDoc.exists) {
        contextEmail = convDoc.data()?.contextEmail || '';
      }
      
      const conversationHistory = await db.collection('messages')
        .where('tenantId', '==', tenantId)
        .where('conversationId', '==', conversationId || `conv_${Date.now()}`)
        .orderBy('createdAt', 'asc')
        .limit(10)
        .get();

      messages = conversationHistory.docs.map(doc => ({
        role: doc.data().from === 'customer' ? 'user' : 'assistant',
        content: doc.data().content
      }));
      
      if (!contextEmail) {
        for (const msg of messages) {
          const emailMatch = msg.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (emailMatch) {
            contextEmail = emailMatch[0];
            break;
          }
        }
      }
    } catch (e) {
      console.log('History query failed, continuing without history');
    }

    // Parse current message
    const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : contextEmail;
    
    const parsedDateTime = parseDateTime(message);
    const appointmentTime = parsedDateTime.date ? parsedDateTime.date.toISOString() : '';
    
    let aiResponse = '';
    let appointmentData = null;
    
    const lowerMessage = message.toLowerCase();
    const isBookingContext = lowerMessage.includes('appointment') || 
                            lowerMessage.includes('schedule') || 
                            lowerMessage.includes('book') ||
                            parsedDateTime.hasDate ||
                            parsedDateTime.hasTime ||
                            email ||
                            messages.slice(-5).some(m => 
                              m.content.toLowerCase().includes('appointment') ||
                              m.content.toLowerCase().includes('book') ||
                              m.content.toLowerCase().includes('schedule')
                            );
    
    if (isBookingContext && email && appointmentTime) {
      try {
        const startDate = new Date(appointmentTime);
        const appointmentDoc = {
          tenantId,
          title: 'Webchat Appointment',
          start: appointmentTime,
          end: new Date(startDate.getTime() + 30 * 60000).toISOString(),
          attendee: email,
          eventId: `webchat_${Date.now()}`,
          htmlLink: '',
          calendarId: 'primary',
          callId: conversationId || `conv_${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        
        const docRef = await db.collection('appointments').add(appointmentDoc);
        
        appointmentData = {
          success: true,
          id: docRef.id,
          appointment: { id: docRef.id, ...appointmentDoc }
        };
        
        const formattedDate = startDate.toLocaleString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true
        });
        
        aiResponse = `Perfect! I've scheduled your appointment for ${formattedDate}. A confirmation will be sent to ${email}. Is there anything else I can help you with?`;
      } catch (error) {
        aiResponse = `I had trouble scheduling your appointment. Please try again with a different date/time format.`;
      }
    } else if (isBookingContext && email && !appointmentTime) {
      aiResponse = `I have your email (${email}). What date and time would work best for your appointment?`;
    } else if (isBookingContext && appointmentTime && !email) {
      aiResponse = `I can schedule you for ${new Date(appointmentTime).toLocaleString()}. What's your email address for the confirmation?`;
    } else if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule') || lowerMessage.includes('book')) {
      aiResponse = `I'd be happy to help you schedule an appointment! Please provide:\n1. Your email address\n2. Preferred date and time\n\nFor example: "tomorrow at 2pm, my email is john@example.com"`;
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      aiResponse = `Hello! I'm ${assistantName}, your AI scheduling assistant. I can help you book appointments quickly and easily. How can I assist you today?`;
    } else {
      aiResponse = `I'm here to help with scheduling appointments and answering questions about our services. You can book an appointment by telling me your email and preferred time, or ask me anything else you'd like to know!`;
    }

    // Save AI response
    await db.collection('messages').add({
      tenantId,
      conversationId: conversationId || `conv_${Date.now()}`,
      channel: channel || 'webchat',
      direction: 'outbound',
      from: assistantName,
      to: 'customer',
      content: aiResponse,
      createdAt: new Date().toISOString(),
      handedOffToHuman: false
    });

    // Update conversation
    const conversationData: any = {
      tenantId,
      customerIdentifier: 'webchat_visitor',
      channel: channel || 'webchat',
      status: 'active',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    if (email) conversationData.contextEmail = email;
    if (appointmentTime) conversationData.contextAppointmentTime = appointmentTime;
    
    await db.collection('conversations').doc(conversationId || `conv_${Date.now()}`).set(conversationData, { merge: true });

    return NextResponse.json({
      response: aiResponse,
      conversationId: conversationId || `conv_${Date.now()}`,
      handedOffToHuman: false,
      appointmentCreated: !!appointmentData,
      appointmentData: appointmentData
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}