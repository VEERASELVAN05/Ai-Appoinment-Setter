'use client';

import { format } from 'date-fns';
import { MessageCircle, Phone, MessageSquare, Instagram, Facebook } from 'lucide-react';
import { Message } from '@/app/api/messages/route';

interface MessagesTableProps {
  messages: Message[];
  title: string;
}

export default function MessagesTable({ messages = [], title }: MessagesTableProps) {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return <MessageCircle className="h-5 w-5 text-blue-600" />;
      case 'whatsapp':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      case 'webchat':
        return <MessageCircle className="h-5 w-5 text-purple-600" />;
      case 'facebook':
        return <Facebook className="h-5 w-5 text-blue-800" />;
      case 'instagram':
        return <Instagram className="h-5 w-5 text-pink-600" />;
      default:
        return <MessageCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'sms':
        return 'bg-blue-100 text-blue-800';
      case 'whatsapp':
        return 'bg-green-100 text-green-800';
      case 'webchat':
        return 'bg-purple-100 text-purple-800';
      case 'facebook':
        return 'bg-blue-100 text-blue-800';
      case 'instagram':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden card-hover">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Channel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Direction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {messages && messages.length > 0 ? (
              messages.map((message) => (
                <tr key={message.id || `msg-${Math.random()}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          {getChannelIcon(message.channel || 'sms')}
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {message.from || 'Unknown'} → {message.to || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 max-w-md truncate">
                          {message.text || 'No message content'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getChannelColor(message.channel || 'sms')}`}>
                      {(message.channel || 'SMS').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      (message.direction || 'inbound') === 'inbound' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {message.direction || 'inbound'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(() => {
                      try {
                        return format(new Date(message.createdAt || new Date()), 'MMM dd, yyyy HH:mm');
                      } catch {
                        return 'Invalid date';
                      }
                    })()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
                    <p>No messages found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
