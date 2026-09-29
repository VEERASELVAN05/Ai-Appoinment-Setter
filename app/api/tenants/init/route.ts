import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'No tenant ID in session' }, { status: 400 });
    }

    const tenantId = session.user.tenantId;
    const userEmail = session.user.email;

    console.log(`[Tenant Init] Checking tenant: ${tenantId}`);
    
    // Check if tenant exists
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    
    if (tenantDoc.exists) {
      console.log(`[Tenant Init] Tenant ${tenantId} already exists`);
      return NextResponse.json({ 
        success: true, 
        message: 'Tenant already exists',
        tenant: tenantDoc.data()
      });
    }

    console.log(`[Tenant Init] Creating tenant: ${tenantId}`);
    
    // Create tenant document with full multi-tenant configuration
    const newTenant = {
      id: tenantId,
      businessName: session.user.name || 'My Business',
      ownerEmail: userEmail,
      createdAt: new Date().toISOString(),
      
      // AI Configuration
      aiConfig: {
        assistantName: 'Riley',
        voiceId: 'Elliot',
        systemPrompt: 'You are a helpful AI appointment scheduling assistant.',
        knowledgeBase: [],
        timezone: 'America/New_York',
        language: 'en'
      },
      
      // Communication Channels
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
      
      // Human Handoff Settings
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
      
      // Integrations
      integrations: {
        googleCalendar: { enabled: false, calendarId: '', refreshToken: '' },
        vapi: { enabled: false, phoneNumber: '', assistantId: '' },
        stripe: { enabled: false, customerId: '' }
      },
      
      // Subscription (Free tier)
      subscription: {
        tier: 'free',
        status: 'active',
        monthlyCallLimit: 100,
        currentMonthCalls: 0
      }
    };
    
    await db.collection('tenants').doc(tenantId).set(newTenant);
    console.log(`[Tenant Init] Tenant ${tenantId} created successfully`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tenant created successfully',
      tenantId,
      tenant: newTenant
    });
    
  } catch (error) {
    console.error('[Tenant Init] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize tenant',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

