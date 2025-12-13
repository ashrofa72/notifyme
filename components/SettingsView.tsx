import React, { useState, useEffect } from 'react';
import { Save, Database, Key, HelpCircle, ShieldAlert, RefreshCw, Smartphone, Code, AlertTriangle, Settings, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { getStoredServerKey, setStoredServerKey } from '../services/fcmService';
import { seedDatabase, syncSheetToFirestore } from '../services/dataService';
import { firebaseConfig } from '../services/firebase';

export const SettingsView: React.FC = () => {
  const [serverKey, setServerKey] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setServerKey(getStoredServerKey());
  }, []);

  // Validation Logic
  const isValidFormat = serverKey === '' || serverKey.startsWith('AIza');
  const isClientKey = serverKey === firebaseConfig.apiKey;

  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/settings/cloudmessaging`;

  const handleSaveKey = () => {
    if (serverKey && !serverKey.startsWith('AIza')) {
        alert("تنسيق المفتاح غير صحيح. يجب أن يبدأ بـ 'AIza'.");
        return;
    }
    
    if (isClientKey) {
        alert("تنبيه: لقد أدخلت 'Client API Key'. هذا المفتاح مخصص لاتصال التطبيق فقط ولا يملك صلاحية إرسال الإشعارات.\n\nيرجى نسخ 'Server Key' من تبويب Cloud Messaging.");
        return;
    }

    setStoredServerKey(serverKey);
    alert('تم حفظ مفتاح الخادم بنجاح!');
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
    if (confirm("سيتم جلب بيانات الطلاب من Google Sheet وتحديث قاعدة بيانات Firebase. لن يتم حذف الرموز (Tokens) الموجودة مسبقاً. هل تريد المتابعة؟")) {
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

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">إعدادات النظام</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-8">
        
        {/* Step 1: Server Key */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            1. مفتاح الخادم (FCM Server Key)
          </h3>
          
          <div className="mt-3 mb-4 bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
             <h4 className="font-bold flex items-center gap-1 mb-2">
                 <AlertTriangle className="w-4 h-4" />
                 كيف تحصل على المفتاح الصحيح؟
             </h4>
             <p className="mb-3 text-gray-700">
                 حدث خطأ في الرابط السابق. يرجى اتباع الخطوات اليدوية التالية بدقة:
             </p>
             
             <div className="space-y-4 bg-white p-4 rounded border border-blue-100">
                 <div className="flex gap-3">
                     <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs">1</span>
                     <div className="flex-1">
                        <p className="mb-2 font-medium">اضغط الزر أدناه لفتح إعدادات Firebase:</p>
                        <a 
                            href={firebaseSettingsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
                        >
                            <Settings className="w-4 h-4" />
                            فتح Firebase Console (Cloud Messaging)
                        </a>
                     </div>
                 </div>

                 <div className="flex gap-3">
                     <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs">2</span>
                     <div className="flex-1">
                        <p className="mb-1 text-gray-800">ابحث عن قسم <strong>Cloud Messaging API (Legacy)</strong> في تلك الصفحة.</p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1 text-xs mt-1">
                            <li>إذا كان <strong>Enabled</strong>: انسخ الـ Key الذي يظهر تحته (يبدأ بـ <code>AIza</code>).</li>
                            <li>إذا كان <strong>Disabled</strong>: اضغط على النقاط الثلاث (⋮) ثم اختر <strong>Manage API in Google Cloud Console</strong> وقم بتفعيله من هناك، ثم عد وحدث الصفحة.</li>
                        </ul>
                     </div>
                 </div>
             </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <input 
                    type="password" 
                    value={serverKey}
                    onChange={(e) => setServerKey(e.target.value.trim())}
                    placeholder="ضع Server Key هنا (يبدأ بـ AIza...)"
                    className={`w-full p-2 border rounded-lg focus:ring-2 outline-none text-left pl-10 ${
                        !isValidFormat || isClientKey ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    dir="ltr"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {serverKey && (isValidFormat && !isClientKey ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />)}
                    </div>
                </div>
                <button 
                onClick={handleSaveKey}
                disabled={!isValidFormat || !serverKey || isClientKey}
                className={`text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                    isValidFormat && serverKey && !isClientKey ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
                }`}
                >
                <Save className="w-4 h-4" />
                حفظ
                </button>
            </div>
            {!isValidFormat && (
                <p className="text-red-600 text-xs font-medium px-1">
                    تنبيه: هذا المفتاح لا يبدو صحيحاً. مفاتيح Google API يجب أن تبدأ بـ "AIza".
                </p>
            )}
            {isClientKey && (
                <p className="text-orange-600 text-xs font-bold px-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    تنبيه: هذا هو مفتاح العميل (Client Key). لن يعمل لإرسال الإشعارات. يرجى إحضار الـ Server Key.
                </p>
            )}
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
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2 justify-center"
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
                بيانات تجريبية (Mock)
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100"></div>

        {/* Step 3: Mobile App Instructions */}
        <div className="bg-green-50 border border-green-100 rounded-lg p-5">
             <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2 mb-3">
                 <Smartphone className="w-5 h-5" />
                 3. تطبيق الهاتف (Flutter App)
             </h3>
             <div className="text-sm text-green-800 space-y-4">
                <p>
                    تم إنشاء كود تطبيق الهاتف داخل المجلد <code>mobile_app/</code> في ملفات المشروع.
                </p>
                
                <div className="bg-white p-4 rounded border border-green-200">
                    <h4 className="font-bold flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4" />
                        تعليمات التشغيل:
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                        <li>انسخ المجلد <code>mobile_app</code> إلى خارج المشروع.</li>
                        <li>افتحه باستخدام VS Code أو Android Studio.</li>
                        <li>نفذ الأمر: <code>flutter pub get</code></li>
                        <li>أضف ملف <code>google-services.json</code> (من Firebase Console) إلى مجلد <code>android/app/</code>.</li>
                        <li>شغل التطبيق: <code>flutter run</code>.</li>
                    </ol>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                    * ملاحظة: يجب تفعيل Cloud Messaging و Firestore في Firebase Console ليعمل التطبيق.
                </p>
             </div>
        </div>
        
      </div>
    </div>
  );
};