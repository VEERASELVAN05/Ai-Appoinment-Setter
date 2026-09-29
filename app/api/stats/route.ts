import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { DashboardStats, ChartData } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch calls and appointments from Firebase
    const [callsSnapshot, appointmentsSnapshot] = await Promise.all([
      db.collection('calls').where('tenantId', '==', tenantId).get(),
      db.collection('appointments').where('tenantId', '==', tenantId).get(),
    ]);

    const totalCalls = callsSnapshot.size;
    const totalAppointments = appointmentsSnapshot.size;
    const conversionRate = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0;

    // Calculate today's stats
    let callsToday = 0;
    let appointmentsToday = 0;

    callsSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now();
      if (new Date(createdAt) >= today) callsToday++;
    });

    appointmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now();
      if (new Date(createdAt) >= today) appointmentsToday++;
    });

    // Generate chart data for last 7 days
    const chartData: ChartData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      let dayCalls = 0;
      let dayAppointments = 0;

      callsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now();
        const callDate = new Date(createdAt).toISOString().split('T')[0];
        if (callDate === dateStr) dayCalls++;
      });

      appointmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now();
        const appointmentDate = new Date(createdAt).toISOString().split('T')[0];
        if (appointmentDate === dateStr) dayAppointments++;
      });

      chartData.push({
        date: dateStr,
        calls: dayCalls,
        appointments: dayAppointments,
      });
    }

    const stats: DashboardStats = {
      totalCalls,
      totalAppointments,
      conversionRate: Math.round(conversionRate * 100) / 100,
      callsToday,
      appointmentsToday,
    };

    return NextResponse.json({ stats, chartData });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
