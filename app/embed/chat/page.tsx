'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ChatWidget from '@/components/ChatWidget';

function ChatWidgetEmbed() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') || '';
  const color = searchParams.get('color') || '#4F46E5';
  const welcome = searchParams.get('welcome') || 'Hi! How can I help you today?';

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <p className="text-red-600 font-semibold mb-2">Error</p>
          <p className="text-gray-600">Missing tenant ID. Please check your embed code.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        body {
          background: transparent !important;
          margin: 0;
          padding: 0;
        }
        html {
          background: transparent !important;
        }
      `}</style>
      <ChatWidget
        tenantId={tenantId}
        welcomeMessage={decodeURIComponent(welcome)}
        widgetColor={color}
        position="bottom-right"
      />
    </>
  );
}

export default function EmbedChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ChatWidgetEmbed />
    </Suspense>
  );
}

