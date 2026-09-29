import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export interface Message {
  id: string;
  tenantId: string;
  messageId: string;
  from: string;
  to: string;
  text: string;
  channel: 'sms' | 'whatsapp' | 'webchat' | 'facebook' | 'instagram';
  provider: string;
  direction: 'inbound' | 'outbound';
  status: string;
  createdAt: string;
  metadata?: any;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const tenantId = searchParams.get('tenantId');
    const channel = searchParams.get('channel');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    let snapshot;
    try {
      let query = db.collection('messages')
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (channel) {
        query = query.where('channel', '==', channel);
      }

      snapshot = await query.get();
    } catch (indexError) {
      console.warn('Messages query falling back (likely missing index):', indexError);
      let fallback = db.collection('messages').where('tenantId', '==', tenantId);
      if (channel) {
        fallback = fallback.where('channel', '==', channel);
      }
      snapshot = await fallback.get();
    }
    const messages: Message[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : data.createdAt,
      } as Message);
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
