import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, companyName } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').where('email', '==', email).get();
    if (!existingUser.empty) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Generate tenant ID (company-specific)
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user document
    const userDoc = {
      email,
      name,
      passwordHash,
      tenantId,
      companyName: companyName || name + "'s Company",
      role: 'admin', // First user is admin of their tenant
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const userRef = await db.collection('users').add(userDoc);

    // Create tenant document with full multi-tenant configuration
    const tenantDoc = {
      id: tenantId,
      businessName: companyName || name + "'s Company",
      ownerEmail: email,
      adminUserId: userRef.id,
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
        stripe: { enabled: false, customerId: '' }
      },
      
      // Subscription (Free tier)
      subscription: {
        plan: 'free',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        callsUsed: 0,
        callsLimit: 50,
        messagesLimit: 100,
        messagesUsed: 0
      }
    };

    await db.collection('tenants').doc(tenantId).set(tenantDoc);

    return NextResponse.json({ 
      success: true, 
      message: 'Account created successfully',
      tenantId 
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
