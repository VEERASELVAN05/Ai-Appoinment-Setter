import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    const tenants = [];

    for (const doc of tenantsSnapshot.docs) {
      const tenantData = { id: doc.id, ...doc.data() };
      
      // Get stats for each tenant
      const [callsSnapshot, appointmentsSnapshot, messagesSnapshot] = await Promise.all([
        db.collection('calls').where('tenantId', '==', doc.id).get(),
        db.collection('appointments').where('tenantId', '==', doc.id).get(),
        db.collection('messages').where('tenantId', '==', doc.id).get(),
      ]);

      const tenantWithStats = {
        ...tenantData,
        stats: {
          totalCalls: callsSnapshot.size,
          totalAppointments: appointmentsSnapshot.size,
          totalMessages: messagesSnapshot.size,
        }
      };

      tenants.push(tenantWithStats);
    }

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, adminEmail, phoneNumber, aiAgentName } = await request.json();

    // Create new tenant
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tenantDoc = {
      id: tenantId,
      name,
      adminUserId: '', // Will be filled when admin user is created
      createdAt: new Date().toISOString(),
      settings: {
        phoneNumber: phoneNumber || '',
        aiAgentName: aiAgentName || 'Riley',
        timezone: 'America/New_York',
        businessHours: {
          start: '09:00',
          end: '17:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        }
      }
    };

    await db.collection('tenants').doc(tenantId).set(tenantDoc);

    return NextResponse.json({ success: true, tenantId });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}
