import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await request.json();
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const newTenant = {
      id: tenantId,
      businessName: 'My Business',
      ownerEmail: 'user@example.com',
      createdAt: new Date().toISOString(),
      
      aiConfig: {
        assistantName: 'Riley',
        voiceId: 'Elliot',
        systemPrompt: 'You are a helpful AI appointment scheduling assistant.',
        knowledgeBase: [],
        timezone: 'America/New_York',
        language: 'en'
      },
      
      channels: {
        voice: { enabled: false, phoneNumber: '', vapiAssistantId: '' },
        webchat: { enabled: true, widgetColor: '#4F46E5', welcomeMessage: 'Hi! How can I help you today?' },
        sms: { enabled: false, twilioPhoneNumber: '' },
        socialMedia: {
          facebook: { enabled: false },
          instagram: { enabled: false },
          whatsapp: { enabled: false }
        }
      },
      
      handoff: {
        enabled: false,
        ringTimeSeconds: 0,
        handoffPhoneNumber: '',
        handoffTriggers: ['speak to a person', 'talk to human', 'agent'],
        availabilitySchedule: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '14:00', enabled: false },
          sunday: { start: '10:00', end: '14:00', enabled: false }
        }
      },
      
      integrations: {
        googleCalendar: { enabled: false, calendarId: '', refreshToken: '' },
        vapi: { enabled: false, phoneNumber: '', assistantId: '' },
        stripe: { enabled: false, customerId: '' }
      },
      
      subscription: {
        tier: 'free',
        status: 'active',
        monthlyCallLimit: 100,
        currentMonthCalls: 0
      }
    };
    
    await db.collection('tenants').doc(tenantId).set(newTenant);
    
    return NextResponse.json({ success: true, message: 'Tenant created successfully' });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}