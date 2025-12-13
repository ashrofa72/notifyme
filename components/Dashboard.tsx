import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const DATA = [
  { name: 'Grade 1', absent: 4, late: 2, present: 45 },
  { name: 'Grade 2', absent: 3, late: 5, present: 40 },
  { name: 'Grade 3', absent: 6, late: 1, present: 38 },
];

const StatCard: React.FC<{ title: string; value: string; icon: React.FC<any>; color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
    <div className={`p-4 rounded-full ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
        <span className="text-sm text-gray-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Students" value="1,245" icon={Users} color="text-blue-600" />
        <StatCard title="Present Today" value="1,120" icon={CheckCircle} color="text-green-600" />
        <StatCard title="Absent Today" value="85" icon={AlertTriangle} color="text-red-600" />
        <StatCard title="Late Arrivals" value="40" icon={Clock} color="text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Attendance by Grade</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="present" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="late" fill="#eab308" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent System Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Notification Batch Sent</p>
                    <p className="text-xs text-gray-500">Grade 1-A • 5 absent notifications</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">2 mins ago</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};