import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { Call } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, callId, from, to, status, eventType, createdAt } = body;

    // Validate required fields
    if (!tenantId || !callId) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, callId' },
        { status: 400 }
      );
    }

    // Create call record
    const callData = {
      tenantId,
      callId,
      from: from || '',
      to: to || '',
      status: status || 'in_progress',
      eventType: eventType || 'function-call',
      createdAt: createdAt || new Date().toISOString(),
    };

    const callRef = await db.collection('calls').add(callData);

    return NextResponse.json(
      { success: true, id: callRef.id, call: callData },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving call:', error);
    return NextResponse.json(
      { error: 'Failed to save call' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const callsRef = db.collection('calls');
    let snapshot;

    try {
      // Preferred query (requires composite index): where + orderBy + limit
      snapshot = await callsRef
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    } catch (err) {
      // Fallback: if index is missing, fetch without orderBy and sort in memory
      console.warn('Calls query falling back to in-memory sort (likely missing index):', err);
      snapshot = await callsRef.where('tenantId', '==', tenantId).get();
    }

    // Normalize createdAt and sort if needed
    let calls: Call[] = [];
    snapshot.forEach((doc) => {
      const data: any = doc.data();
      const createdAtIso = data.createdAt?.seconds
        ? new Date(data.createdAt.seconds * 1000).toISOString()
        : typeof data.createdAt === 'string'
          ? data.createdAt
          : new Date().toISOString();

      calls.push({
        id: doc.id,
        ...data,
        createdAt: createdAtIso,
      } as Call);
    });

    // If the query was the fallback (no orderBy), ensure sorting and limiting here
    calls = calls
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({ calls });
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}
