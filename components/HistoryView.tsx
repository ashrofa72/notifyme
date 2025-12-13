import React from 'react';
import { NotificationLog } from '../types';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface HistoryViewProps {
  logs: NotificationLog[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">سجل الإشعارات</h2>
        <div className="text-sm text-gray-500">
            الإجمالي المرسل: {logs.length}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-4 text-right">الحالة</th>
                <th className="px-6 py-4 text-right">الطالب</th>
                <th className="px-6 py-4 text-right">النوع</th>
                <th className="px-6 py-4 text-right">التوقيت</th>
                <th className="px-6 py-4 text-right">التفاصيل / الخطأ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    لم يتم إرسال أي إشعارات بعد.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {log.status === 'Sent' ? (
                        <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>تم</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <XCircle className="w-3 h-3" />
                          <span>فشل</span>
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
                         {log.type === 'Absent' ? 'غياب' : 'تأخير'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600" dir="ltr">{log.timestamp}</td>
                    <td className="px-6 py-4 text-sm">
                        {log.status === 'Failed' ? (
                            <div className="flex items-center text-red-600 gap-1" title={log.message}>
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate max-w-xs">{log.message}</span>
                            </div>
                        ) : (
                            <span className="text-gray-500 truncate max-w-xs block" title={log.message}>
                                {log.message}
                            </span>
                        )}
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