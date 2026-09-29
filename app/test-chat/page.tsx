'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import ChatWidget from '@/components/ChatWidget';

export default function TestChatPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Webchat Widget Test Page
        </h1>
        <p className="text-gray-600 mb-8">
          Test your webchat appointment booking here. This is a fresh page with no cache.
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">Try These:</h2>
          <ul className="space-y-2 text-gray-700">
            <li>✅ "Book my appointment"</li>
            <li>✅ "tomorrow at 2pm, my email is john@example.com"</li>
            <li>✅ "my email is john@example.com" then "tomorrow at 2pm"</li>
          </ul>
        </div>

        {session?.user?.tenantId && (
          <ChatWidget
            tenantId={session.user.tenantId}
            welcomeMessage="Hi! How can I help you today?"
            widgetColor="#4F46E5"
            position="bottom-right"
          />
        )}
      </div>
    </div>
  );
}

