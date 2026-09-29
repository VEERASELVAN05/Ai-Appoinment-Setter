'use client';

import { format } from 'date-fns';
import { ExternalLink, Phone, Calendar, User } from 'lucide-react';

interface DataTableProps {
  data: any[];
  type: 'calls' | 'appointments';
  title: string;
}

export default function DataTable({ data, type, title }: DataTableProps) {
  const toDate = (value: any): Date | null => {
    if (!value) return null;
    try {
      if (typeof value === 'string') {
        // Handle JSON-encoded objects that contain { dateTime }
        const trimmed = value.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const obj = JSON.parse(trimmed);
          if (obj?.dateTime) return new Date(obj.dateTime);
        }
        return new Date(value);
      }
      if (typeof value === 'object') {
        if ('dateTime' in value && value.dateTime) {
          return new Date((value as any).dateTime);
        }
        if ('seconds' in value) {
          return new Date((value as any).seconds * 1000);
        }
      }
    } catch (_) {
      return null;
    }
    return null;
  };
  const renderCallRow = (call: any) => (
    <tr key={call.id} className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{call.from}</div>
            <div className="text-sm text-gray-500">to {call.to}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          call.status === 'completed' 
            ? 'bg-green-100 text-green-800' 
            : call.status === 'failed'
            ? 'bg-red-100 text-red-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {call.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {call.eventType}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {format(new Date(typeof call.createdAt === 'number' ? call.createdAt : call.createdAt), 'MMM dd, yyyy HH:mm')}
      </td>
    </tr>
  );

  const renderAppointmentRow = (appointment: any) => (
    <tr key={appointment.id} className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{appointment.title}</div>
            <div className="text-sm text-gray-500">{appointment.attendee || 'No attendee'}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {(() => { const d = toDate(appointment.start); return d ? format(d, 'MMM dd, yyyy HH:mm') : '-'; })()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {(() => { const d = toDate(appointment.end); return d ? format(d, 'HH:mm') : '-'; })()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {appointment.htmlLink && (
          <a 
            href={appointment.htmlLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View
          </a>
        )}
      </td>
    </tr>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden card-hover">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {type === 'calls' ? (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </>
              ) : (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length > 0 ? (
              type === 'calls' 
                ? data.map(renderCallRow)
                : data.map(renderAppointmentRow)
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <User className="h-12 w-12 text-gray-300 mb-4" />
                    <p>No {type} found</p>
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
