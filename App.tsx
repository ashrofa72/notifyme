import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AttendanceView } from './components/AttendanceView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { AuthPage } from './components/AuthPage';
import { ViewState, Student, NotificationLog, AttendanceStatus } from './types';
import { MOCK_CLASSES, INITIAL_LOGS } from './services/mockData';
import { getStudents, fetchStudentsFromGoogleSheet } from './services/dataService';
import { auth } from './services/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // App State
  const [students, setStudents] = useState<Student[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>(INITIAL_LOGS);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Load Data only when user is logged in
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsDataLoading(true);
      const data = await getStudents();
      if (data.length > 0) {
        setStudents(data);
      } else {
        setStudents([]); 
      }
      setIsDataLoading(false);
    };

    fetchData();
  }, [user]); 

  // Handlers
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStudents([]); // Clear data on logout
      setCurrentView(ViewState.DASHBOARD);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleUpdateStudentStatus = useCallback((studentCode: string, status: AttendanceStatus) => {
    setStudents((prev) => 
      prev.map((s) => {
        if (s.studentCode === studentCode) {
          return { ...s, status };
        }
        return s;
      })
    );
  }, []);

  const handleNotificationsSent = useCallback((newLogs: NotificationLog[]) => {
    setNotificationLogs((prev) => [...newLogs, ...prev]);
  }, []);

  const handleMarkNotificationSent = useCallback((studentCode: string) => {
    setStudents((prev) =>
      prev.map((s) => s.studentCode === studentCode ? { ...s, notificationSent: true } : s)
    );
  }, []);

  const handleFetchClassData = useCallback(async (grade: string, className: string) => {
    // Logic: If user selects Grade 1 - Class 1, we try to fetch from Google Sheet
    if (grade === '1' && className === '1') {
       try {
         const sheetStudents = await fetchStudentsFromGoogleSheet();
         
         if (sheetStudents.length > 0) {
            setStudents(prev => {
                // Remove existing students for this specific class to avoid duplicates
                const otherStudents = prev.filter(s => !(s.grade === grade && s.className === className));
                // Add the fresh data
                return [...otherStudents, ...sheetStudents];
            });
         }
       } catch (e) {
         console.warn("Failed to fetch Google Sheet data. Ensure sheet is published to web.");
         alert("تعذر تحميل البيانات من Google Sheet. يرجى التأكد من نشر الورقة (File -> Share -> Publish to web).");
       }
    }
  }, []);

  const renderContent = () => {
    if (isDataLoading && currentView !== ViewState.SETTINGS) {
       return <div className="flex h-full items-center justify-center text-gray-400">جاري تحميل البيانات...</div>;
    }

    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard />;
      case ViewState.ATTENDANCE:
        return (
          <AttendanceView
            students={students.length > 0 ? students : []} 
            classes={MOCK_CLASSES}
            onUpdateStudentStatus={handleUpdateStudentStatus}
            onNotificationsSent={handleNotificationsSent}
            onMarkNotificationSent={handleMarkNotificationSent}
            onFetchClassData={handleFetchClassData}
          />
        );
      case ViewState.HISTORY:
        return <HistoryView logs={notificationLogs} />;
      case ViewState.SETTINGS:
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        userEmail={user.email}
        userName={user.displayName}
        onLogout={handleLogout}
      />
      {/* Changed ml-64 to mr-64 for RTL sidebar */}
      <main className="flex-1 mr-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
           {students.length === 0 && !isDataLoading && currentView === ViewState.ATTENDANCE && (
             <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
               لا يوجد طلاب في قاعدة البيانات. اختر <strong>الصف 1 - الفصل 1</strong> للجلب من Sheets أو اذهب إلى <strong>الإعدادات</strong> لإضافة بيانات تجريبية.
             </div>
           )}
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;