'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  appointmentData?: any;
  isAppointmentConfirmation?: boolean;
}

interface ChatWidgetProps {
  tenantId: string;
  welcomeMessage?: string;
  widgetColor?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export default function ChatWidget({
  tenantId,
  welcomeMessage = 'Hi! How can I help you today?',
  widgetColor = '#4F46E5',
  position = 'bottom-right'
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Debug: Log tenantId on mount and when it changes
  useEffect(() => {
    console.log('ChatWidget tenantId:', tenantId);
    if (!tenantId) {
      console.error('No tenant ID in session');
    }
  }, [tenantId]);

  // Initialize conversation
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConversationId(newConversationId);
      
      // Add welcome message
      setMessages([{
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length, welcomeMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;
    
    // Validate tenantId before sending
    if (!tenantId) {
      console.error('Cannot send message: No tenant ID');
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, there was a configuration error. Please refresh the page and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputValue; // Save before clearing
    setInputValue('');
    setIsTyping(true);

    try {
      console.log('Sending message with tenantId:', tenantId);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          conversationId,
          message: messageToSend,
          channel: 'webchat'
        }),
      });

      const data = await response.json();
      
      console.log('Webchat API response:', { status: response.status, data });

      // Check if response was successful
      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: data.response || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        appointmentData: data.appointmentData,
        isAppointmentConfirmation: data.appointmentCreated
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const positionClasses = position === 'bottom-right' 
    ? 'right-4 sm:right-6' 
    : 'left-4 sm:left-6';

  return (
    <div className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50`} style={{ pointerEvents: 'auto' }}>
      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div className="mb-4 bg-white rounded-2xl shadow-2xl w-[90vw] sm:w-96 h-[500px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div 
            className="p-4 text-white flex items-center justify-between"
            style={{ backgroundColor: widgetColor }}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div className="ml-3">
                <h3 className="font-semibold">Chat with us</h3>
                <p className="text-xs opacity-90">We typically reply instantly</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'text-white'
                      : 'bg-white text-gray-800 shadow-sm'
                  }`}
                  style={message.role === 'user' ? { backgroundColor: widgetColor } : {}}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Appointment confirmation card */}
                  {message.isAppointmentConfirmation && message.appointmentData && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm font-semibold text-green-800">Appointment Confirmed</span>
                      </div>
                      <div className="text-xs text-green-700 space-y-1">
                        <p><strong>Date:</strong> {new Date(message.appointmentData.appointment?.start || '').toLocaleDateString()}</p>
                        <p><strong>Time:</strong> {new Date(message.appointmentData.appointment?.start || '').toLocaleTimeString()}</p>
                        <p><strong>Email:</strong> {message.appointmentData.appointment?.attendee}</p>
                        <p><strong>ID:</strong> {message.appointmentData.appointment?.id}</p>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-opacity-50 text-sm"
                disabled={isTyping}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="p-2 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                style={{ backgroundColor: widgetColor }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Powered by Auto-Scheduler Pro
            </p>
          </div>
        </div>
      )}

      {/* Minimized Chat */}
      {isOpen && isMinimized && (
        <div 
          className="mb-4 bg-white rounded-lg shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow animate-in slide-in-from-bottom-5"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: widgetColor }}
              >
                <MessageCircle className="w-6 h-6" />
              </div>
              <div className="ml-3">
                <p className="font-semibold text-gray-800">Chat with us</p>
                <p className="text-xs text-gray-600">{messages.length} messages</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 animate-in zoom-in-50"
          style={{ backgroundColor: widgetColor }}
        >
          <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 mx-auto" />
          
          {/* Notification badge (optional) */}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            !
          </span>
        </button>
      )}
    </div>
  );
}

