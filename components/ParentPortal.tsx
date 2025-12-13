import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, messaging } from '../services/firebase';
import { getToken } from 'firebase/messaging';
import { Student } from '../types';
import { Bell, BellRing, CheckCircle, AlertCircle, Clock, Loader2, LogOut, ExternalLink } from 'lucide-react';

interface ParentPortalProps {
  onBack: () => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({ onBack }) => {
  const [step, setStep] = useState<'INPUT' | 'DASHBOARD'>('INPUT');
  const [studentCode, setStudentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(Notification.permission);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    // Detect if running in an iframe (Preview environment)
    setIsIframe(window.self !== window.top);
  }, []);

  // Listen to real-time updates when connected
  useEffect(() => {
    if (step === 'DASHBOARD' && studentCode) {
      const unsub = onSnapshot(doc(db, 'students', studentCode), (doc) => {
        if (doc.exists()) {
          setStudentData(doc.data() as Student);
        }
      });
      return () => unsub();
    }
  }, [step, studentCode]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const code = studentCode.trim().toUpperCase();
      const studentRef = doc(db, 'students', code);
      const docSnap = await getDoc(studentRef);

      if (!docSnap.exists()) {
        setError('كود الطالب غير صحيح. يرجى التأكد والمحاولة مرة أخرى.');
        setLoading(false);
        return;
      }

      setStudentData(docSnap.data() as Student);
      setStudentCode(code);
      setStep('DASHBOARD');
      
      // Try to register for notifications immediately
      // We pass the code so we can save the token to the correct document
      requestNotificationPermission(code);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ في الاتصال.');
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async (code: string) => {
    try {
      let swRegistration = undefined;

      // 1. Register Service Worker (Required for background notifications)
      if ('serviceWorker' in navigator) {
        try {
           // FIX: Use specific scope and absolute URL to prevent Origin Mismatch errors in Cloud environments
           const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin).href;
           swRegistration = await navigator.serviceWorker.register(swUrl, {
             scope: '/'
           });
           
           // CRITICAL: Wait for the service worker to be ready/active before asking for token
           // This prevents "failed to register" errors in some browsers
           await navigator.serviceWorker.ready;
           
           console.log('Service Worker registered with scope:', swRegistration.scope);
        } catch (swError) {
           console.warn('Service Worker registration warning:', swError);
           // We continue, as sometimes the browser uses a cached worker or handles it implicitly
        }
      }

      // 2. Request Permission
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        // 3. Get Token
        const token = await getToken(messaging, {
            serviceWorkerRegistration: swRegistration,
            vapidKey: 'BCVMV9GCRP4Rko9UVBjrSX_nCGy3f68ZgbL2AKFnPyrpbgepVdHZoXfp6SgSlC31mHec0LYF1Y3o4NX2j4rAX_Y'
        });
        
        if (token) {
           // 4. Save Token to Firestore
           await updateDoc(doc(db, 'students', code), {
             fcmToken: token,
             lastTokenUpdate: new Date().toISOString() // Track when it was last updated
           });
           console.log('Device linked successfully:', token);
           alert("تم تفعيل الإشعارات بنجاح! تم ربط هذا الجهاز بالطالب.");
        } else {
           throw new Error("لم يتم استلام Token من Firebase.");
        }
      } else {
        // Handle blocked permission
        if (permission === 'denied') {
             setError("تم حظر الإشعارات. يرجى النقر على أيقونة القفل بجوار الرابط في المتصفح واختيار 'Reset Permission' ثم إعادة المحاولة.");
        }
      }
    } catch (err: any) {
      console.error('Failed to enable notifications:', err);
      
      let msg = err.message || 'خطأ غير معروف';
      
      if (msg.includes('origin') || msg.includes('register')) {
          msg = "خطأ في بيئة التشغيل: يرجى التأكد من فتح الموقع في نافذة مستقلة (Open in New Tab).";
      } else if (msg.includes('Missing VAPID key')) {
          msg = "خطأ في إعدادات Firebase: يرجى توليد Key Pair من لوحة التحكم.";
      }

      setError(`فشل تفعيل التنبيهات: ${msg}`);
      alert(`عذراً، حدث خطأ أثناء تفعيل التنبيهات:\n${msg}`);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Present': return 'bg-green-100 text-green-700 border-green-200';
      case 'Absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'Late': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'Present': return 'حاضر';
      case 'Absent': return 'غائب';
      case 'Late': return 'متأخر';
      default: return 'غير معروف';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Present': return <CheckCircle className="w-8 h-8" />;
      case 'Absent': return <AlertCircle className="w-8 h-8" />;
      case 'Late': return <Clock className="w-8 h-8" />;
      default: return <Bell className="w-8 h-8" />;
    }
  };

  if (step === 'INPUT') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-blue-600 p-6 text-center">
            <BellRing className="w-12 h-12 text-white mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white">بوابة أولياء الأمور</h1>
            <p className="text-blue-100 text-sm">أدخل كود الطالب لتلقي الإشعارات</p>
          </div>

          <div className="p-6">
            {isIframe && (
                <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 text-sm rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-bold mb-1">تنبيه وضع المعاينة</p>
                            <p>قد لا تعمل الإشعارات داخل نافذة المعاينة هذه.</p>
                            <button 
                                onClick={openInNewTab}
                                className="mt-2 text-blue-600 underline flex items-center gap-1 hover:text-blue-800"
                            >
                                <ExternalLink className="w-3 h-3" />
                                فتح في نافذة جديدة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
               <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 rtl:text-right">
                 <AlertCircle className="w-4 h-4 flex-shrink-0" />
                 <span>{error}</span>
               </div>
            )}

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كود الطالب</label>
                <input
                  type="text"
                  placeholder="مثال: S1001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-lg tracking-widest uppercase font-mono"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !studentCode}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'ربط الجهاز'}
              </button>
            </form>
            
            <button onClick={onBack} className="w-full mt-4 text-gray-400 text-sm hover:text-gray-600">
              رجوع لتسجيل دخول الإدارة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
       <div className="max-w-md mx-auto space-y-4">
          {/* Header */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">مرحباً، {studentData?.parentName || 'ولي الأمر'}</h2>
            <button onClick={() => setStep('INPUT')} className="text-gray-400 hover:text-red-500">
              <LogOut className="w-5 h-5 rtl:rotate-180" />
            </button>
          </div>

          {/* Student Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold backdrop-blur-sm mb-3">
                  {studentData?.studentName.charAt(0)}
                </div>
                <h1 className="text-xl font-bold">{studentData?.studentName}</h1>
                <p className="text-blue-100 opacity-90">{studentData?.studentCode}</p>
                <p className="text-sm mt-1 bg-white/10 inline-block px-3 py-1 rounded-full">
                  الصف {studentData?.grade} - الفصل {studentData?.className}
                </p>
             </div>
             
             <div className="p-6">
                <div className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 ${getStatusColor(studentData?.status || '')}`}>
                   {getStatusIcon(studentData?.status || '')}
                   <div className="text-center">
                      <p className="text-sm opacity-75 font-medium">حالة اليوم</p>
                      <p className="text-3xl font-bold">{getStatusText(studentData?.status || '')}</p>
                   </div>
                </div>

                {permissionStatus === 'default' && (
                  <button 
                    onClick={() => requestNotificationPermission(studentCode)}
                    className="w-full mt-6 bg-gray-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <BellRing className="w-5 h-5" />
                    تفعيل التنبيهات
                  </button>
                )}
                
                {permissionStatus === 'denied' && (
                   <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center border border-red-100">
                      <p className="font-bold mb-1">تم حظر الإشعارات</p>
                      <p>لإصلاح ذلك، اضغط على أيقونة القفل 🔒 في شريط العنوان، واختر "Reset Permission" أو "Allow"، ثم أعد تحميل الصفحة.</p>
                   </div>
                )}
             </div>
          </div>

          <div className="text-center text-xs text-gray-400 mt-8">
            AlzahraaConnection Parent Portal
          </div>
       </div>
    </div>
  );
};