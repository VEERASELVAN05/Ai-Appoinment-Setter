'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Phone, Calendar, TrendingUp, Users, RefreshCw, MessageCircle, MessageSquare, Settings, Clock, Building2, Save } from 'lucide-react';
import Navbar from '@/components/Navbar';
import StatsCard from '@/components/StatsCard';
import Chart from '@/components/Chart';
import DataTable from '@/components/DataTable';
import MessagesTable from '@/components/MessagesTable';
import ChatWidget from '@/components/ChatWidget';
import { DashboardStats, ChartData, Call, Appointment } from '@/types';
import { Message } from '@/app/api/messages/route';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    phoneNumber: '+15053753869',
    aiAgentName: 'Riley',
    timezone: 'America/New_York',
    businessHours: {
      start: '09:00',
      end: '17:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    }
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  const fetchData = async () => {
    if (!session?.user?.tenantId) {
      console.log('No tenant ID in session');
      return;
    }
    
    const tenantId = session.user.tenantId;
    try {
      setLoading(true);
      const [statsRes, callsRes, appointmentsRes, messagesRes] = await Promise.all([
        fetch(`/api/stats?tenantId=${tenantId}`),
        fetch(`/api/calls?limit=10&tenantId=${tenantId}`),
        fetch(`/api/appointments?limit=10&tenantId=${tenantId}`),
        fetch(`/api/messages?limit=10&tenantId=${tenantId}`)
      ]);

      const [statsData, callsData, appointmentsData, messagesData] = await Promise.all([
        statsRes.json(),
        callsRes.json(),
        appointmentsRes.json(),
        messagesRes.json()
      ]);

      setStats(statsData.stats || {});
      setChartData(statsData.chartData || []);
      setCalls(callsData.calls || []);
      setAppointments(appointmentsData.appointments || []);
      setMessages(Array.isArray(messagesData.messages) ? messagesData.messages : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Calls"
          value={stats?.totalCalls || 0}
          icon={Phone}
          gradient="gradient-primary"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Appointments"
          value={stats?.totalAppointments || 0}
          icon={Calendar}
          gradient="gradient-success"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${stats?.conversionRate || 0}%`}
          icon={TrendingUp}
          gradient="gradient-warning"
          trend={{ value: 3, isPositive: true }}
        />
        <StatsCard
          title="Today's Calls"
          value={stats?.callsToday || 0}
          icon={Users}
          gradient="gradient-info"
          trend={{ value: 5, isPositive: false }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart data={chartData} type="line" title="Calls & Appointments Trend" />
        <Chart data={chartData} type="bar" title="Daily Performance" />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable data={calls.slice(0, 5)} type="calls" title="Recent Calls" />
        <DataTable data={appointments.slice(0, 5)} type="appointments" title="Recent Appointments" />
      </div>
    </div>
  );

  const renderCalls = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Calls</h1>
      </div>
      <DataTable data={calls} type="calls" title="All Calls" />
    </div>
  );

  const renderAppointments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
      </div>
      <DataTable data={appointments} type="appointments" title="All Appointments" />
    </div>
  );

  const renderMessages = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
      </div>
      
      {/* Channel Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">SMS</p>
              <p className="text-xl font-bold text-gray-900">
                {messages ? messages.filter(m => m.channel === 'sms').length : 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">WhatsApp</p>
              <p className="text-xl font-bold text-gray-900">
                {messages ? messages.filter(m => m.channel === 'whatsapp').length : 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Webchat</p>
              <p className="text-xl font-bold text-gray-900">
                {messages ? messages.filter(m => m.channel === 'webchat').length : 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{messages ? messages.length : 0}</p>
            </div>
          </div>
        </div>
      </div>

        <MessagesTable messages={Array.isArray(messages) ? messages : []} title="All Messages" />
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your AI agent and business settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Agent Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <MessageSquare className="h-6 w-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">AI Agent</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Agent Name</label>
              <input
                type="text"
                value={settings.aiAgentName}
                onChange={(e) => setSettings(prev => ({ ...prev, aiAgentName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Riley"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="text"
                value={settings.phoneNumber}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Clock className="h-6 w-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={settings.businessHours.start}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    businessHours: { ...prev.businessHours, start: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={settings.businessHours.end}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    businessHours: { ...prev.businessHours, end: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Building2 className="h-6 w-6 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={session?.user?.name || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tenant ID</label>
              <input
                type="text"
                value={session?.user?.tenantId || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">AI Agent (Riley)</span>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Phone System</span>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Firebase Database</span>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">n8n Workflows</span>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Running</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 card-hover">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Calls</span>
              <span className="font-semibold">{stats?.totalCalls || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Appointments Booked</span>
              <span className="font-semibold">{stats?.totalAppointments || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Conversion Rate</span>
              <span className="font-semibold text-green-600">{stats?.conversionRate || 0}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 card-hover">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Activity</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Calls Today</span>
              <span className="font-semibold">{stats?.callsToday || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Appointments Today</span>
              <span className="font-semibold">{stats?.appointmentsToday || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Success Rate</span>
              <span className="font-semibold text-blue-600">
                {stats?.callsToday ? Math.round((stats.appointmentsToday / stats.callsToday) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 card-hover">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Trends</h3>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {chartData.reduce((sum, day) => sum + day.calls, 0)}
              </div>
              <div className="text-gray-600">Total Calls This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {chartData.reduce((sum, day) => sum + day.appointments, 0)}
              </div>
              <div className="text-gray-600">Appointments This Week</div>
            </div>
          </div>
        </div>
      </div>

      {/* Large Charts */}
      <div className="space-y-6">
        <Chart data={chartData} type="line" title="7-Day Trend Analysis" />
        <Chart data={chartData} type="bar" title="Daily Performance Comparison" />
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">All system notifications and alerts</p>
        </div>
        <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
          Mark All as Read
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          <div className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">New call received</h3>
                  <span className="text-xs text-gray-500">2 minutes ago</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Customer inquiry about pricing from +1 555-123-4567</p>
                <div className="mt-2 flex space-x-3">
                  <button className="text-xs text-blue-600 hover:text-blue-500">View Call Details</button>
                  <button className="text-xs text-gray-500 hover:text-gray-700">Mark as Read</button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Appointment scheduled</h3>
                  <span className="text-xs text-gray-500">15 minutes ago</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Business consultation scheduled for tomorrow at 2 PM</p>
                <div className="mt-2 flex space-x-3">
                  <button className="text-xs text-blue-600 hover:text-blue-500">View Appointment</button>
                  <button className="text-xs text-gray-500 hover:text-gray-700">Mark as Read</button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">New message received</h3>
                  <span className="text-xs text-gray-500">1 hour ago</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">WhatsApp message from customer: "When can we schedule a follow-up?"</p>
                <div className="mt-2 flex space-x-3">
                  <button className="text-xs text-blue-600 hover:text-blue-500">Reply</button>
                  <button className="text-xs text-gray-500 hover:text-gray-700">Mark as Read</button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 hover:bg-gray-50 transition-colors opacity-60">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Weekly report available</h3>
                  <span className="text-xs text-gray-500">2 days ago</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Your weekly performance report is ready for review</p>
                <div className="mt-2 flex space-x-3">
                  <button className="text-xs text-blue-600 hover:text-blue-500">View Report</button>
                  <span className="text-xs text-gray-400">Read</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading && !stats) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'calls':
        return renderCalls();
      case 'appointments':
        return renderAppointments();
      case 'messages':
        return renderMessages();
      case 'settings':
        return renderSettings();
      case 'analytics':
        return renderAnalytics();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
