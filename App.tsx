import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AttendanceView } from './components/AttendanceView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { AuthPage } from './components/AuthPage';
import { ViewState, Student, NotificationLog, AttendanceStatus } from './types';
import { MOCK_CLASSES, INITIAL_LOGS } from './services/mockData';
import { 
    subscribeToStudents, 
    fetchStudentsFromGoogleSheet, 
    updateStudentStatusInDb, 
    markNotificationAsSentInDb,
    syncSheetToFirestore
} from './services/dataService';
import { auth } from './services/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Loader2, ShieldAlert } from 'lucide-react';

// Define allowed admins
const ADMIN_EMAILS = ['as.ka1@hotmail.om', 'as.ka1@hotmail.com'];

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

  // Load Data only when user is logged in - REALTIME
  useEffect(() => {
    if (!user) return;

    setIsDataLoading(true);
    // This listener automatically updates the UI whenever Firestore changes
    // (e.g. Parent links device, or Admin changes status)
    const unsubscribe = subscribeToStudents((data) => {
      setStudents(data);
      setIsDataLoading(false);
    });

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

  // UPDATED: Now saves to Firestore directly
  const handleUpdateStudentStatus = useCallback(async (studentCode: string, status: AttendanceStatus) => {
    // We do NOT set local state here (setStudents). 
    // We update Firestore, and the `subscribeToStudents` listener will update the UI automatically.
    try {
        await updateStudentStatusInDb(studentCode, status);
    } catch (error) {
        alert("فشل تحديث الحالة. يرجى التحقق من الاتصال.");
    }
  }, []);

  const handleNotificationsSent = useCallback((newLogs: NotificationLog[]) => {
    setNotificationLogs((prev) => [...newLogs, ...prev]);
  }, []);

  // UPDATED: Now saves to Firestore directly
  const handleMarkNotificationSent = useCallback(async (studentCode: string) => {
    try {
        await markNotificationAsSentInDb(studentCode);
    } catch (error) {
        console.error("Failed to mark notification sent in DB", error);
    }
  }, []);

  const handleFetchClassData = useCallback(async (grade: string, className: string) => {
    // Logic: If user selects Grade 1 - Class 1, we try to sync from Google Sheet
    if (grade === '1' && className === '1') {
       try {
         // We use the sync function that writes to DB directly
         const msg = await syncSheetToFirestore();
         console.log(msg);
       } catch (e) {
         console.warn("Failed to auto-sync Google Sheet data.", e);
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

  // ADMIN CHECK
  const isAuthorized = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  if (!isAuthorized) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4" dir="rtl">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح بالدخول</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    عذراً، هذا النظام مخصص للمسؤولين فقط.
                    <br />
                    الحساب <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mx-1" dir="ltr">{user.email}</span> لا يملك صلاحيات الوصول.
                </p>
                <button 
                    onClick={handleLogout}
                    className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-200"
                >
                    تسجيل الخروج
                </button>
            </div>
        </div>
    );
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