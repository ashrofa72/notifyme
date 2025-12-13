import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Users, History, Settings, BellRing, LogOut } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  userEmail: string | null;
  userName: string | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, userEmail, userName, onLogout }) => {
  const navItems = [
    { view: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { view: ViewState.ATTENDANCE, label: 'Attendance', icon: Users },
    { view: ViewState.HISTORY, label: 'History', icon: History },
    { view: ViewState.SETTINGS, label: 'Settings', icon: Settings },
  ];

  // Helper to generate initials
  const getInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    return userEmail ? userEmail.substring(0, 2).toUpperCase() : 'AD';
  };

  // Helper to get display name
  const getDisplayName = () => {
    if (userName) return userName;
    if (userEmail) return userEmail.split('@')[0];
    return 'Admin';
  };

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 z-10">
      <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
        <div className="bg-blue-600 p-2 rounded-lg">
            <BellRing className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">NotifyEd</h1>
          <p className="text-xs text-gray-500">Parent Alerts</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 flex-shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
              {getInitials()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate max-w-[100px]" title={getDisplayName()}>
                {getDisplayName()}
              </p>
              <p className="text-xs text-gray-500 truncate" title={userEmail || ''}>
                {userEmail || 'System Admin'}
              </p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Sign Out"
            className="text-gray-400 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};