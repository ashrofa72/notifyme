import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AttendanceView } from './components/AttendanceView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { AuthPage } from './components/AuthPage';
import { ViewState, Student, NotificationLog, AttendanceStatus } from './types';
import { MOCK_CLASSES, INITIAL_LOGS } from './services/mockData';
import { subscribeToStudents, fetchStudentsFromGoogleSheet, updateStudentToken, syncSheetToFirestore } from './services/dataService';
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

  // Real-time Data Subscription
  useEffect(() => {
    if (!user) {
        setStudents([]);
        return;
    }

    setIsDataLoading(true);
    
    // Subscribe to Firestore updates
    // This ensures that if a token is added in DB, the app reflects it immediately without refresh
    const unsubscribe = subscribeToStudents(
        (updatedStudents) => {
            setStudents(updatedStudents);
            setIsDataLoading(false);
        },
        (error) => {
            console.error("Failed to subscribe to students:", error);
            setIsDataLoading(false);
        }
    );

    return () => unsubscribe();
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

  // Modified: Instead of setting local state directly (which might overwrite DB tokens),
  // we now trigger a sync to DB. The subscription will then update the UI.
  const handleFetchClassData = useCallback(async (grade: string, className: string) => {
    // Logic: If user selects Grade 1 - Class 1, trigger a sync to ensure we have data
    if (grade === '1' && className === '1') {
       try {
         // This syncs sheet to DB. DB update triggers 'subscribeToStudents', updating the UI.
         await syncSheetToFirestore();
       } catch (e) {
         console.warn("Auto-sync failed:", e);
         // Fallback: If sync fails (e.g. invalid sheet), we don't block the UI, 
         // but we also don't overwrite local state with potentially empty token data manually.
       }
    }
  }, []);

  const handleUpdateStudentToken = useCallback(async (studentCode: string, token: string) => {
    try {
        await updateStudentToken(studentCode, token);
        // No need to manually update local state 'setStudents' here because 
        // updateStudentToken writes to DB, and the onSnapshot listener will update 'students' automatically.
    } catch (error) {
        console.error("Failed to save token", error);
        alert("فشل حفظ الرمز في قاعدة البيانات.");
    }
  }, []);

  const renderContent = () => {
    if (isDataLoading && students.length === 0 && currentView !== ViewState.SETTINGS) {
       return <div className="flex h-full items-center justify-center text-gray-400">جاري تحميل البيانات...</div>;
    }

    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard />;
      case ViewState.ATTENDANCE:
        return (
          <AttendanceView
            students={students} 
            classes={MOCK_CLASSES}
            onUpdateStudentStatus={handleUpdateStudentStatus}
            onNotificationsSent={handleNotificationsSent}
            onMarkNotificationSent={handleMarkNotificationSent}
            onFetchClassData={handleFetchClassData}
            onUpdateStudentToken={handleUpdateStudentToken}
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