const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID || 'roi-appointments',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  projectId: process.env.FIREBASE_PROJECT_ID || 'roi-appointments',
};

// Initialize Firebase Admin
const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
const db = getFirestore(app);

async function createTenant() {
  const tenantId = 'tenant_1759865651547_4ne6y2dtr';
  
  try {
    console.log(`Creating tenant: ${tenantId}`);
    
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
    console.log('✅ Tenant created successfully!');
  } catch (error) {
    console.error('Error creating tenant:', error);
  }
}

createTenant()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });