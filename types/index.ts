export interface Call {
  id: string;
  tenantId: string;
  eventType: string;
  callId: string;
  from: string;
  to: string;
  status: string;
  recordingUrl?: string;
  transcript?: string;
  intent?: string;
  createdAt: string; // ISO string
}

export interface Appointment {
  id: string;
  tenantId: string;
  title: string;
  start: string;
  end: string;
  attendee: string;
  eventId: string;
  htmlLink: string;
  createdAt: string; // ISO string
}

export interface Message {
  id: string;
  tenantId: string;
  messageId?: string;
  from: string;
  to: string;
  text: string;
  channel?: 'sms' | 'whatsapp' | 'webchat' | 'facebook' | 'instagram';
  provider: string;
  direction?: 'inbound' | 'outbound';
  status?: string;
  createdAt: string; // ISO string
  metadata?: any;
}

export interface DashboardStats {
  totalCalls: number;
  totalAppointments: number;
  conversionRate: number;
  callsToday: number;
  appointmentsToday: number;
}

export interface ChartData {
  date: string;
  calls: number;
  appointments: number;
}
