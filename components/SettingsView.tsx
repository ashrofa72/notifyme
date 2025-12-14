import React, { useState, useEffect } from 'react';
import { Save, Database, Key, HelpCircle, Smartphone, Code, RefreshCw, ExternalLink, Link as LinkIcon, Loader2 } from 'lucide-react';
import { getStoredServerKey, setStoredServerKey, requestBrowserToken } from '../services/fcmService';
import { seedDatabase, syncSheetToFirestore, updateStudentToken } from '../services/dataService';

export const SettingsView: React.FC = () => {
  const [serverKey, setServerKey] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Simulator State
  const [simStudentCode, setSimStudentCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Hardcoded project ID from existing configuration
  const PROJECT_ID = "notify-me-efcdf";

  useEffect(() => {
    setServerKey(getStoredServerKey());
  }, []);

  const handleSaveKey = () => {
    setStoredServerKey(serverKey);
    alert('تم حفظ المفتاح بنجاح!');
  };

  const handleSeed = async () => {
    if (confirm("سيتم الكتابة فوق البيانات الحالية ببيانات وهمية للتجربة. هل أنت متأكد؟")) {
      setIsSeeding(true);
      try {
        await seedDatabase();
        alert('تمت إضافة البيانات التجريبية بنجاح.');
      } catch (e) {
        alert('حدث خطأ.');
        console.error(e);
      } finally {
        setIsSeeding(false);
      }
    }
  };

  const handleSyncSheet = async () => {
    if (confirm("سيتم جلب بيانات الطلاب من Google Sheet وتحديث قاعدة بيانات Firebase. هل تريد المتابعة؟")) {
        setIsSyncing(true);
        try {
            const message = await syncSheetToFirestore();
            alert(message);
        } catch (e: any) {
            alert("فشل المزامنة: " + e.message);
        } finally {
            setIsSyncing(false);
        }
    }
  };

  const handleLinkDevice = async () => {
    if (!simStudentCode.trim()) {
        alert("يرجى إدخال كود الطالب.");
        return;
    }

    setIsLinking(true);
    try {
        const token = await requestBrowserToken();
        if (token) {
            await updateStudentToken(simStudentCode.trim(), token);
            alert(`تم ربط هذا المتصفح بنجاح بالطالب: ${simStudentCode}`);
            setSimStudentCode('');
        } else {
            alert("فشل الحصول على الرمز. تأكد من منح إذن الإشعارات للمتصفح.");
        }
    } catch (e) {
        console.error(e);
        alert("حدث خطأ أثناء الربط.");
    } finally {
        setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">إعدادات النظام</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-8">
        
        {/* Step 1: Credentials */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            1. مفتاح الإشعارات (Notification Key)
          </h3>
          
          <div className="mt-4 mb-6 bg-blue-50 border border-blue-100 rounded-lg p-5">
            <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-3">
                <HelpCircle className="w-5 h-5" />
                طريقة الحصول على المفتاح
            </h4>
            
            <p className="text-sm text-blue-900 mb-2">
              لديك خياران: استخدام المفتاح القديم (Legacy) أو رمز OAuth 2.0 (ya29).
            </p>

            <ol className="list-decimal list-inside text-sm text-blue-900 space-y-3 bg-white p-3 rounded border border-blue-100">
                <li className="font-semibold">الخيار الأسهل (Legacy Key):</li>
                <ul className="list-disc list-inside mr-5 space-y-1 text-gray-700">
                  <li>
                      افتح وحدة تحكم Firebase وانتقل إلى 
                      <a 
                        href={`https://console.firebase.google.com/project/${PROJECT_ID}/settings/cloudmessaging`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 mx-1 font-bold underline text-blue-700 hover:text-blue-900"
                      >
                          Project Settings &gt; Cloud Messaging
                          <ExternalLink className="w-3 h-3" />
                      </a>.
                  </li>
                  <li>ابحث عن القسم المسمى <strong>Cloud Messaging API (Legacy)</strong> في أعلى الصفحة.</li>
                  <li>إذا كانت الحالة <strong>Disabled</strong> (معطل)، اضغط على القائمة (ثلاث نقاط) ثم اختر <em>"Manage API in Google Cloud Console"</em> واضغط <strong>Enable</strong>.</li>
                  <li>بعد التفعيل، عد إلى صفحة إعدادات Firebase وقم بتحديث الصفحة.</li>
                  <li>انسخ الكود الطويل المكتوب بجانب <strong>Server key</strong> (يبدأ عادةً بـ <code>AIza...</code>).</li>
                </ul>
            </ol>
            
            <div className="mt-3 text-xs text-blue-800 opacity-80">
                ملاحظة: يدعم النظام أيضاً رموز الوصول الحديثة التي تبدأ بـ <code>ya29...</code> إذا كنت تستخدم OAuth 2.0 Playground.
            </div>
          </div>

          <p className="text-sm text-gray-600 font-medium mb-2">
            الصق المفتاح هنا (Server Key / Access Token):
          </p>
          
          <div className="flex gap-3">
            <input 
              type="password" 
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              placeholder="AIzaSy... OR ya29..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-left font-mono text-sm"
              dir="ltr"
            />
            <button 
              onClick={handleSaveKey}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              حفظ المفتاح
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100"></div>

        {/* Step 2: Data Management */}
        <div>
           <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            2. إدارة بيانات الطلاب
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            يجب تحديث قاعدة البيانات من ملف Google Sheet لضمان وجود الطلاب في النظام.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
                onClick={handleSyncSheet}
                disabled={isSyncing}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2 justify-center shadow-sm"
            >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'جاري المزامنة...' : 'مزامنة من Google Sheet إلى Firebase'}
            </button>

            <button 
                onClick={handleSeed}
                disabled={isSeeding}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition flex items-center gap-2 justify-center border border-gray-300"
            >
                <Database className="w-4 h-4" />
                إضافة بيانات تجريبية
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100"></div>

        {/* Step 3: Simulator (Link Current Browser) */}
        <div>
           <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            3. محاكي تطبيق الولي (Link This Device)
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            استخدم هذه الأداة لربط متصفحك الحالي بطالب معين لتجربة استلام الإشعارات دون الحاجة لتطبيق الهاتف.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
             <input 
                type="text" 
                value={simStudentCode}
                onChange={(e) => setSimStudentCode(e.target.value)}
                placeholder="أدخل كود الطالب (مثال: S1001)"
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-left font-mono text-sm"
                dir="ltr"
             />
             <button 
                onClick={handleLinkDevice}
                disabled={isLinking}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2 justify-center shadow-sm disabled:opacity-50"
             >
                {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                ربط المتصفح بالطالب
             </button>
          </div>
        </div>

        <div className="border-t border-gray-100"></div>

        {/* Step 4: Mobile App Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 opacity-75">
             <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                 <Code className="w-4 h-4" />
                 للمطورين: كيفية عمل تطبيق Flutter
             </h3>
             <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 font-mono">
                <li>User opens Flutter app.</li>
                <li>App gets FCM Token via <code>FirebaseMessaging.instance.getToken()</code>.</li>
                <li>User inputs Student Code.</li>
                <li>App writes Token to <code>students/[CODE]</code> document in Firestore.</li>
             </ol>
        </div>
        
      </div>
    </div>
  );
};