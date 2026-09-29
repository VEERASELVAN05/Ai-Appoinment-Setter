import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    console.log('[Tenant Lookup] Looking up tenant for phone:', phoneNumber);

    // Query Firestore for tenant with this Vapi phone number
    const tenantsRef = db.collection('tenants');
    const snapshot = await tenantsRef
      .where('integrations.vapi.phoneNumber', '==', phoneNumber)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('[Tenant Lookup] No tenant found for phone:', phoneNumber);
      // Return default tenant ID if no match found
      return NextResponse.json({ 
        tenantId: 't_demo',
        found: false,
        message: 'No tenant configured for this phone number'
      });
    }

    const tenantDoc = snapshot.docs[0];
    const tenantId = tenantDoc.id;

    console.log('[Tenant Lookup] Found tenant:', tenantId);

    return NextResponse.json({
      tenantId,
      found: true,
    });
  } catch (error) {
    console.error('[Tenant Lookup] Error:', error);
    return NextResponse.json({ 
      error: 'Lookup failed',
      tenantId: 't_demo',
      found: false
    }, { status: 500 });
  }
}

