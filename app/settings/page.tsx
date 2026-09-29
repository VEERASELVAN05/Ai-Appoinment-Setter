'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Phone, 
  MessageCircle, 
  Clock, 
  Users, 
  Save, 
  Code,
  Calendar,
  Bot,
  Shield
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ChatWidget from '@/components/ChatWidget';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ai');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [settings, setSettings] = useState({
    // AI Configuration
    aiConfig: {
      assistantName: 'Riley',
      voiceId: 'Elliot',
      systemPrompt: '',
      timezone: 'America/New_York',
      language: 'en'
    },
    
    // Channels
    channels: {
      voice: { enabled: false, phoneNumber: '', vapiAssistantId: '' },
      webchat: { enabled: true, widgetColor: '#4F46E5', welcomeMessage: 'Hi! How can I help you today?' },
      sms: { enabled: false, twilioPhoneNumber: '' },
      socialMedia: {
        facebook: { enabled: false, pageId: '' },
        instagram: { enabled: false, accountId: '' },
        whatsapp: { enabled: false, phoneNumber: '' }
      }
    },
    
    // Human Handoff
    handoff: {
      enabled: false,
      ringTimeSeconds: 10,
      handoffPhoneNumber: '',
      handoffTriggers: ['speak to a person', 'talk to human', 'agent']
    },
    
    // Google Calendar
    integrations: {
      googleCalendar: { enabled: false, calendarId: '' }
    }
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Load tenant settings
  useEffect(() => {
    if (session?.user?.tenantId) {
      loadSettings();
    }
  }, [session]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenants/${session?.user?.tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(prevSettings => ({
          ...prevSettings,
          ...data.tenant
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      const response = await fetch(`/api/tenants/${session?.user?.tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    }
  };

  const renderAISettings = () => (
    <div className="space-y-6">
      {/* Tenant ID Display */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 border-2 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Shield className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Your Tenant ID</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Use this ID for API integrations and testing</p>
            <div className="flex items-center space-x-3">
              <code className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-mono text-sm text-gray-800 select-all">
                {session?.user?.tenantId || 'Loading...'}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(session?.user?.tenantId || '');
                  setSaveStatus('saved');
                  setTimeout(() => setSaveStatus('idle'), 2000);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-6">
          <Bot className="h-6 w-6 text-purple-600 mr-2" />
          <h3 className="text-xl font-semibold text-gray-900">AI Assistant Configuration</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assistant Name
            </label>
            <input
              type="text"
              value={settings.aiConfig.assistantName}
              onChange={(e) => setSettings({
                ...settings,
                aiConfig: { ...settings.aiConfig, assistantName: e.target.value }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Riley"
            />
            <p className="text-xs text-gray-500 mt-1">The name your AI assistant will use when talking to customers</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice ID (Vapi)
            </label>
            <select
              value={settings.aiConfig.voiceId}
              onChange={(e) => setSettings({
                ...settings,
                aiConfig: { ...settings.aiConfig, voiceId: e.target.value }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="Elliot">Elliot (Male, Professional)</option>
              <option value="Sarah">Sarah (Female, Friendly)</option>
              <option value="James">James (Male, Deep)</option>
              <option value="Emily">Emily (Female, Warm)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              value={settings.aiConfig.systemPrompt}
              onChange={(e) => setSettings({
                ...settings,
                aiConfig: { ...settings.aiConfig, systemPrompt: e.target.value }
              })}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              placeholder="You are a helpful AI appointment scheduling assistant for [Your Business]..."
            />
            <p className="text-xs text-gray-500 mt-1">Instructions that define how your AI behaves and responds</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={settings.aiConfig.timezone}
                onChange={(e) => setSettings({
                  ...settings,
                  aiConfig: { ...settings.aiConfig, timezone: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={settings.aiConfig.language}
                onChange={(e) => setSettings({
                  ...settings,
                  aiConfig: { ...settings.aiConfig, language: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChannelsSettings = () => (
    <div className="space-y-6">
      {/* Webchat */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MessageCircle className="h-6 w-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Webchat Widget</h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.channels.webchat.enabled}
              onChange={(e) => setSettings({
                ...settings,
                channels: {
                  ...settings.channels,
                  webchat: { ...settings.channels.webchat, enabled: e.target.checked }
                }
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {settings.channels.webchat.enabled && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Message
              </label>
              <input
                type="text"
                value={settings.channels.webchat.welcomeMessage}
                onChange={(e) => setSettings({
                  ...settings,
                  channels: {
                    ...settings.channels,
                    webchat: { ...settings.channels.webchat, welcomeMessage: e.target.value }
                  }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Hi! How can I help you today?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Widget Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={settings.channels.webchat.widgetColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    channels: {
                      ...settings.channels,
                      webchat: { ...settings.channels.webchat, widgetColor: e.target.value }
                    }
                  })}
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.channels.webchat.widgetColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    channels: {
                      ...settings.channels,
                      webchat: { ...settings.channels.webchat, widgetColor: e.target.value }
                    }
                  })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Code className="h-4 w-4 text-gray-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">
                  Embed Code
                </label>
              </div>
              <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
{`<iframe 
  src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/chat?tenantId=${session?.user?.tenantId}&color=${encodeURIComponent(settings.channels.webchat.widgetColor)}&welcome=${encodeURIComponent(settings.channels.webchat.welcomeMessage)}"
  style="position:fixed;bottom:20px;right:20px;width:400px;height:600px;border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;"
></iframe>`}
              </pre>
              <p className="text-xs text-gray-500 mt-2">Copy and paste this code into your website's HTML</p>
            </div>
          </div>
        )}
      </div>

      {/* SMS */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MessageSquare className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">SMS Messaging</h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.channels.sms.enabled}
              onChange={(e) => setSettings({
                ...settings,
                channels: {
                  ...settings.channels,
                  sms: { ...settings.channels.sms, enabled: e.target.checked }
                }
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.channels.sms.enabled && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Twilio Phone Number
            </label>
            <input
              type="tel"
              value={settings.channels.sms.twilioPhoneNumber}
              onChange={(e) => setSettings({
                ...settings,
                channels: {
                  ...settings.channels,
                  sms: { ...settings.channels.sms, twilioPhoneNumber: e.target.value }
                }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="+1234567890"
            />
            <p className="text-xs text-gray-500 mt-1">Your Twilio phone number for receiving SMS</p>
          </div>
        )}
      </div>

      {/* Voice */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Phone className="h-6 w-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Voice Calls</h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.channels.voice.enabled}
              onChange={(e) => setSettings({
                ...settings,
                channels: {
                  ...settings.channels,
                  voice: { ...settings.channels.voice, enabled: e.target.checked }
                }
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {settings.channels.voice.enabled && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={settings.channels.voice.phoneNumber}
                onChange={(e) => setSettings({
                  ...settings,
                  channels: {
                    ...settings.channels,
                    voice: { ...settings.channels.voice, phoneNumber: e.target.value }
                  }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="+1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vapi Assistant ID
              </label>
              <input
                type="text"
                value={settings.channels.voice.vapiAssistantId}
                onChange={(e) => setSettings({
                  ...settings,
                  channels: {
                    ...settings.channels,
                    voice: { ...settings.channels.voice, vapiAssistantId: e.target.value }
                  }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="252a609c-7f7f-422c-98d1-640f33d08e71"
              />
              <p className="text-xs text-gray-500 mt-1">Your Vapi.ai assistant ID</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderHandoffSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-orange-600 mr-2" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Human Handoff</h3>
              <p className="text-sm text-gray-600 mt-1">Allow customers to speak with a human agent</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.handoff.enabled}
              onChange={(e) => setSettings({
                ...settings,
                handoff: { ...settings.handoff, enabled: e.target.checked }
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
          </label>
        </div>

        {settings.handoff.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ring Time (seconds)
              </label>
              <input
                type="number"
                value={settings.handoff.ringTimeSeconds}
                onChange={(e) => setSettings({
                  ...settings,
                  handoff: { ...settings.handoff, ringTimeSeconds: parseInt(e.target.value) || 0 }
                })}
                min="0"
                max="60"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long to ring your phone before AI answers (0 = AI answers immediately)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Handoff Phone Number
              </label>
              <input
                type="tel"
                value={settings.handoff.handoffPhoneNumber}
                onChange={(e) => setSettings({
                  ...settings,
                  handoff: { ...settings.handoff, handoffPhoneNumber: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="+1234567890"
              />
              <p className="text-xs text-gray-500 mt-1">Phone number to transfer calls to</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Handoff Trigger Phrases
              </label>
              <textarea
                value={settings.handoff.handoffTriggers.join('\n')}
                onChange={(e) => setSettings({
                  ...settings,
                  handoff: { ...settings.handoff, handoffTriggers: e.target.value.split('\n').filter(t => t.trim()) }
                })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="speak to a person&#10;talk to human&#10;agent"
              />
              <p className="text-xs text-gray-500 mt-1">
                One phrase per line. When customer says these, AI will transfer to human.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderIntegrationsSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-blue-600 mr-2" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Google Calendar</h3>
              <p className="text-sm text-gray-600 mt-1">Sync appointments to your calendar</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.integrations.googleCalendar.enabled}
              onChange={(e) => setSettings({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  googleCalendar: { ...settings.integrations.googleCalendar, enabled: e.target.checked }
                }
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.integrations.googleCalendar.enabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calendar ID
            </label>
            <input
              type="text"
              value={settings.integrations.googleCalendar.calendarId}
              onChange={(e) => setSettings({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  googleCalendar: { ...settings.integrations.googleCalendar, calendarId: e.target.value }
                }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="primary or your-calendar-id@group.calendar.google.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use "primary" for your main calendar, or specify a calendar ID
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'channels':
        return renderChannelsSettings();
      case 'handoff':
        return renderHandoffSettings();
      case 'integrations':
        return renderIntegrationsSettings();
      default:
        return renderAISettings();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab="settings" onTabChange={(tab) => {
        if (tab !== 'settings') {
          router.push('/');
        }
      }} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Configure your AI assistant and integrations</p>
          </div>
          
          <button
            onClick={saveSettings}
            disabled={saveStatus === 'saving'}
            className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
              saveStatus === 'saved'
                ? 'bg-green-600 text-white'
                : saveStatus === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            <Save className="h-5 w-5 mr-2" />
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Changes'}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ai'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bot className="inline-block h-5 w-5 mr-2" />
              AI Assistant
            </button>
            
            <button
              onClick={() => setActiveTab('channels')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'channels'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageCircle className="inline-block h-5 w-5 mr-2" />
              Channels
            </button>
            
            <button
              onClick={() => setActiveTab('handoff')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'handoff'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline-block h-5 w-5 mr-2" />
              Human Handoff
            </button>
            
            <button
              onClick={() => setActiveTab('integrations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'integrations'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="inline-block h-5 w-5 mr-2" />
              Integrations
            </button>
          </nav>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
      
      {/* Webchat Widget - Direct DOM Injection (No Iframe) */}
      {status === 'authenticated' && session?.user?.tenantId && (
        <ChatWidget
          tenantId={session.user.tenantId}
          welcomeMessage="Hi! How can I help you today?"
          widgetColor="#4F46E5"
          position="bottom-right"
        />
      )}
    </div>
  );
}
