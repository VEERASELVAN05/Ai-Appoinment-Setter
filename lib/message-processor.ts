import { db } from '@/lib/firebase-admin';

// Helper function to parse month names
function parseMonth(monthStr: string): number {
  const months: { [key: string]: number } = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };
  return months[monthStr.toLowerCase()] ?? -1;
}

// Comprehensive date/time parser
export function parseDateTime(message: string): { date: Date | null, hasDate: boolean, hasTime: boolean } {
  const lowerMessage = message.toLowerCase();
  let resultDate: Date | null = null;
  let hasDate = false;
  let hasTime = false;
  
  // Start with current date/time
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();
  let hours = 9; // Default 9 AM
  let minutes = 0;
  
  // 1. Check for relative dates
  if (lowerMessage.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    year = tomorrow.getFullYear();
    month = tomorrow.getMonth();
    day = tomorrow.getDate();
    hasDate = true;
  } else if (lowerMessage.includes('today')) {
    hasDate = true;
  } else if (lowerMessage.includes('next week')) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    year = nextWeek.getFullYear();
    month = nextWeek.getMonth();
    day = nextWeek.getDate();
    hasDate = true;
  }
  
  // 2. Check for day names (monday, tuesday, etc.)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < dayNames.length; i++) {
    if (lowerMessage.includes(dayNames[i])) {
      const targetDay = i;
      const currentDay = now.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      year = targetDate.getFullYear();
      month = targetDate.getMonth();
      day = targetDate.getDate();
      hasDate = true;
      break;
    }
  }
  
  // 3. Check for specific dates with various formats
  const datePatterns = [
    // "12 october 2025", "12 oct 2025"
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i,
    // "october 12 2025", "oct 12 2025"
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s+(\d{4})/i,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\s+(\d{4})/i,
    // "12 october", "12 oct"
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    // "october 12", "oct 12"
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i,
    // "10/12/2025", "10/12", "10-12-2025", "10-12"
    /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
    // "2025-10-12" (ISO format)
    /(\d{4})-(\d{1,2})-(\d{1,2})/
  ];
  
  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      if (match[0].includes('-') && match[1]?.length === 4) {
        // ISO format: YYYY-MM-DD
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        day = parseInt(match[3]);
      } else if (match[0].includes('/') || match[0].includes('-')) {
        // MM/DD or MM/DD/YYYY
        month = parseInt(match[1]) - 1;
        day = parseInt(match[2]);
        if (match[3]) year = parseInt(match[3].length === 2 ? '20' + match[3] : match[3]);
      } else if (!isNaN(parseInt(match[1]))) {
        // Day first: "12 october" or "12 october 2025"
        day = parseInt(match[1]);
        month = parseMonth(match[2]);
        if (match[3]) year = parseInt(match[3]); // Has year
      } else {
        // Month first: "october 12" or "october 12 2025"
        month = parseMonth(match[1]);
        day = parseInt(match[2]);
        if (match[3]) year = parseInt(match[3]); // Has year
      }
      
      if (month !== -1 && day >= 1 && day <= 31) {
        hasDate = true;
        break;
      }
    }
  }
  
  // 4. Check for time with comprehensive patterns
  const timePatterns = [
    // "4pm", "4 pm", "4PM"
    /(\d{1,2})\s*(pm|am)/i,
    // "4:30pm", "4:30 pm", "16:30"
    /(\d{1,2}):(\d{2})\s*(pm|am)?/i,
    // "4 o'clock", "4 oclock"
    /(\d{1,2})\s*o'?clock\s*(pm|am)?/i,
    // "at 4", "at 16"
    /at\s+(\d{1,2})/i,
    // "16:00" (24-hour)
    /(\d{1,2}):(\d{2})/
  ];
  
  for (const pattern of timePatterns) {
    const timeMatch = message.match(pattern);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      // Convert to 24-hour format
      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      } else if (!ampm && hours >= 1 && hours <= 11) {
        // No AM/PM specified and hour is 1-11, assume PM for business hours
        hours += 12;
      }
      
      hasTime = true;
      break;
    }
  }
  
  // If we have a date or time, create the Date object
  if (hasDate || hasTime) {
    try {
      resultDate = new Date(year, month, day, hours, minutes, 0, 0);
      
      // Validate the date
      if (isNaN(resultDate.getTime())) {
        console.error('Invalid date created:', { year, month, day, hours, minutes });
        return { date: null, hasDate: false, hasTime: false };
      }
      
      // If date is in the past, assume next year
      if (resultDate < now && hasDate) {
        resultDate.setFullYear(year + 1);
      }
      
      // If only time specified and it's in the past today, assume tomorrow
      if (hasTime && !hasDate && resultDate < now) {
        resultDate.setDate(resultDate.getDate() + 1);
      }
      
      // Final validation
      if (isNaN(resultDate.getTime())) {
        console.error('Date became invalid after adjustments');
        return { date: null, hasDate: false, hasTime: false };
      }
    } catch (e) {
      console.error('Error creating date:', e);
      return { date: null, hasDate: false, hasTime: false };
    }
  }
  
  return { date: resultDate, hasDate, hasTime };
}

// Unified message processor for all channels
export async function processMessageWithAI(
  message: string, 
  tenantId: string, 
  customerId: string, 
  assistantName: string,
  channel: string = 'webchat'
): Promise<{ aiResponse: string; appointmentData: any }> {
  let aiResponse = '';
  let appointmentData = null;
  
  const lowerMessage = message.toLowerCase();
  
  // Extract email - improved regex to handle quotes and special characters
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = message.match(emailRegex);
  let email = emailMatches ? emailMatches[0] : '';
  
  // Clean the message for better parsing (remove quotes and extra characters)
  const cleanMessage = message.replace(/["""'']/g, '').trim();
  
  // Use comprehensive date/time parser on cleaned message
  const parsedDateTime = parseDateTime(cleanMessage);
  let appointmentTime = parsedDateTime.date ? parsedDateTime.date.toISOString() : '';
  
  console.log('Parsed data:', { 
    email, 
    appointmentTime, 
    parsedDateTime,
    cleanMessage,
    channel
  });
  
  // Check if we're in an appointment booking context
  const isBookingContext = lowerMessage.includes('appointment') || 
                          lowerMessage.includes('schedule') || 
                          lowerMessage.includes('book') ||
                          lowerMessage.includes('yes') ||
                          lowerMessage.includes('yeah') ||
                          lowerMessage.includes('sure');
  
  // Channel-specific emojis and formatting
  const channelEmojis = {
    webchat: { success: '✅', error: '❌', info: 'ℹ️', calendar: '📅', clock: '🕒' },
    sms: { success: '✓', error: '✗', info: 'i', calendar: '📅', clock: '🕒' },
    whatsapp: { success: '✅', error: '❌', info: 'ℹ️', calendar: '📅', clock: '🕒' },
    facebook: { success: '🎉', error: '❌', info: 'ℹ️', calendar: '📅', clock: '🕒' },
    instagram: { success: '✨', error: '❌', info: 'ℹ️', calendar: '📅', clock: '🕒' }
  };
  
  const emojis = channelEmojis[channel as keyof typeof channelEmojis] || channelEmojis.webchat;
  
  if (isBookingContext && (email || appointmentTime)) {
    if (email && appointmentTime) {
      // Create appointment directly in Firestore
      try {
        console.log('Creating appointment:', { 
          email, 
          appointmentTime, 
          tenantId,
          cleanMessage,
          channel
        });
        
        const appointmentDoc = {
          tenantId,
          title: `${channel.charAt(0).toUpperCase() + channel.slice(1)} Appointment`,
          start: appointmentTime,
          end: new Date(new Date(appointmentTime).getTime() + 30 * 60000).toISOString(), // 30 min later
          attendee: email,
          eventId: `${channel}_${Date.now()}`,
          htmlLink: '',
          calendarId: 'primary',
          callId: customerId,
          createdAt: new Date().toISOString()
        };
        
        const docRef = await db.collection('appointments').add(appointmentDoc);
        console.log('Appointment created successfully:', docRef.id);
        
        appointmentData = {
          success: true,
          id: docRef.id,
          appointment: { id: docRef.id, ...appointmentDoc }
        };
        
        const formattedDate = new Date(appointmentTime).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        aiResponse = `${emojis.success} Perfect! I've scheduled your appointment for ${formattedDate}. A confirmation will be sent to ${email}. Is there anything else I can help you with?`;
      } catch (error) {
        console.error('Appointment booking error:', error);
        aiResponse = `${emojis.error} I had trouble scheduling your appointment. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact us directly.`;
      }
    } else if (email && !appointmentTime) {
      aiResponse = `I have your email (${email}). What date and time would work best for your appointment?`;
    } else if (appointmentTime && !email) {
      aiResponse = `I can schedule you for ${new Date(appointmentTime).toLocaleString()}. What's your email address for the confirmation?`;
    } else {
      aiResponse = `I'd be happy to help you schedule an appointment! Please provide your email address and preferred date/time.`;
    }
  } else if (email && !isBookingContext) {
    // User provided email but hasn't mentioned appointment yet
    aiResponse = `I have your email (${email}). Would you like to schedule an appointment? If so, please let me know your preferred date and time!`;
  } else if (appointmentTime && !isBookingContext) {
    // User mentioned a date/time but no appointment context
    aiResponse = `I noticed you mentioned a date/time. Would you like to schedule an appointment? If so, please provide your email address!`;
  } else if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule') || lowerMessage.includes('book')) {
    aiResponse = `I'd be happy to help you schedule an appointment! Please provide:\n1. Your email address\n2. Preferred date and time\n\nFor example: "tomorrow at 2pm, my email is john@example.com"`;
  } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    aiResponse = `Hello! I'm ${assistantName}, your AI scheduling assistant. I can help you book appointments quickly and easily. How can I assist you today?`;
  } else if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
    aiResponse = `I can help you with:\n- Scheduling appointments (just tell me your email and preferred time)\n- Answering questions about our services\n- Providing business information\n\nWhat would you like to do?`;
  } else if (lowerMessage.includes('hours') || lowerMessage.includes('open')) {
    aiResponse = `We're typically available Monday-Friday from 9 AM to 5 PM. Would you like to schedule an appointment? Just let me know your email and preferred time!`;
  } else if (lowerMessage.includes('human') || lowerMessage.includes('person') || lowerMessage.includes('agent')) {
    aiResponse = `I'll connect you with a human agent right away. Please hold for a moment while I transfer your conversation.`;
  } else if (lowerMessage.includes('cancel') || lowerMessage.includes('reschedule')) {
    aiResponse = `I understand you need to make changes to an appointment. For cancellations or rescheduling, please contact us directly or I can connect you with a human agent who can help with existing appointments.`;
  } else {
    // Try to be more helpful based on context
    aiResponse = `I'm here to help with scheduling appointments and answering questions about our services. You can book an appointment by telling me your email and preferred time, or ask me anything else you'd like to know!`;
  }
  
  return { aiResponse, appointmentData };
}

// Get tenant configuration
export async function getTenantConfig(tenantId: string) {
  try {
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    
    if (!tenantDoc.exists) {
      throw new Error('Tenant not found');
    }

    const tenantData = tenantDoc.data();
    
    // Handle both old and new tenant structures
    const aiConfig = tenantData?.aiConfig || tenantData?.settings || {};
    const assistantName = aiConfig.assistantName || aiConfig.aiAgentName || 'Riley';
    const systemPrompt = aiConfig.systemPrompt || 'You are a helpful AI appointment scheduling assistant.';
    
    return {
      assistantName,
      systemPrompt,
      aiConfig,
      tenantData
    };
  } catch (error) {
    console.error('Error getting tenant config:', error);
    return {
      assistantName: 'Riley',
      systemPrompt: 'You are a helpful AI appointment scheduling assistant.',
      aiConfig: {},
      tenantData: {}
    };
  }
}
