import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { Appointment } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, title, start, end, attendee, eventId, htmlLink, calendarId, callId } = body;

    // Validate required fields
    if (!tenantId || !title || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, title, start, end' },
        { status: 400 }
      );
    }

    // Save to Firestore
    const appointmentsRef = db.collection('appointments');
    const appointmentData = {
      tenantId,
      title,
      start,
      end,
      attendee: attendee || '',
      eventId: eventId || '',
      htmlLink: htmlLink || '',
      calendarId: calendarId || '',
      callId: callId || '',
      createdAt: new Date().toISOString(),
    };

    const docRef = await appointmentsRef.add(appointmentData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      appointment: {
        id: docRef.id,
        ...appointmentData,
      },
    });
  } catch (error) {
    console.error('Error saving appointment:', error);
    return NextResponse.json({ error: 'Failed to save appointment' }, { status: 500 });
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

    console.log('[Appointments API] Fetching for tenantId:', tenantId);

    // Fetch from Firestore
    const appointmentsRef = db.collection('appointments');
    
    // Try without orderBy first to avoid index issues
    const snapshot = await appointmentsRef
      .where('tenantId', '==', tenantId)
      .limit(limit)
      .get();

    console.log('[Appointments API] Found', snapshot.size, 'appointments');

    const firebaseAppointments: Appointment[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('[Appointments API] Document:', doc.id, data);
      firebaseAppointments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : data.createdAt,
      } as Appointment);
    });

    // Sort in memory
    firebaseAppointments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ appointments: firebaseAppointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments', details: String(error) }, { status: 500 });
  }
}
