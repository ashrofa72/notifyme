import React from 'react';
import { NotificationLog } from '../types';
import { CheckCircle, XCircle } from 'lucide-react';

interface HistoryViewProps {
  logs: NotificationLog[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Notification History</h2>
        <div className="text-sm text-gray-500">
            Total Sent: {logs.length}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Message Body</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No notifications sent yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {log.status === 'Sent' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Sent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <XCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{log.studentName}</div>
                      <div className="text-xs text-gray-500">{log.studentCode}</div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`text-xs font-bold px-2 py-1 rounded ${
                         log.type === 'Absent' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                       }`}>
                         {log.type}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.timestamp}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.message}>
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};