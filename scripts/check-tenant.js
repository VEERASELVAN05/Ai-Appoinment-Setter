// Quick script to check if tenant exists and create if missing
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAndCreateTenant(tenantId, userEmail) {
  try {
    console.log(`Checking tenant: ${tenantId}`);
    
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    
    if (!tenantDoc.exists) {
      console.log('❌ Tenant not found! Creating now...');
      
      const newTenant = {
        id: tenantId,
        businessName: 'My Business',
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
      console.log('✅ Tenant created successfully!');
    } else {
      console.log('✅ Tenant exists!');
      console.log('Tenant data:', JSON.stringify(tenantDoc.data(), null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run for your tenant
checkAndCreateTenant('tenant_1759865651547_4ne6y2dtr', 'your-email@example.com')
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

