import React, { useState, useEffect } from 'react';
import { Save, Database, Key, HelpCircle, ShieldAlert, RefreshCw, Smartphone, Code, FileJson, AlertTriangle } from 'lucide-react';
import { getStoredServerKey, setStoredServerKey } from '../services/fcmService';
import { seedDatabase, syncSheetToFirestore } from '../services/dataService';

export const SettingsView: React.FC = () => {
  const [serverKey, setServerKey] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
          
          <div className="mt-4 mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-bold text-yellow-800 flex items-center gap-2 mb-2">
                <FileJson className="w-4 h-4" />
                لديك ملف JSON (Service Account)؟
            </h4>
            <p className="text-sm text-yellow-800 leading-relaxed mb-3">
                الملف الذي يبدأ بـ <code>"type": "service_account"</code> يحتوي على مفاتيح سرية <strong>لا يمكن</strong> استخدامها مباشرة في المتصفح لأسباب أمنية.
            </p>
            <p className="text-sm text-yellow-800 font-semibold">لديك خياران:</p>
            <ul className="list-disc list-inside text-sm text-yellow-800 mt-1 space-y-1">
                <li>
                    <strong>الخيار الأسهل:</strong> استخدم <strong>Legacy Server Key</strong> (يبدأ بـ AIza).
                    <a href="https://console.firebase.google.com/project/notify-me-efcdf/settings/cloudmessaging" target="_blank" className="underline mr-1 text-blue-600 font-bold">
                        اضغط هنا لتفعيل Legacy Cloud Messaging
                    </a> في Firebase Console ثم انسخ المفتاح.
                </li>
                <li>
                    <strong>الخيار المتقدم (JSON):</strong> إذا كنت مصرًا على استخدام الـ JSON، يجب عليك توليد <strong>Access Token</strong> مؤقت (يبدأ بـ ya29) باستخدام أمر مثل <code>gcloud auth print-access-token</code> ولصقه أدناه.
                </li>
            </ul>
          </div>

          <p className="text-sm text-gray-500 mt-1 mb-2">
            أدخل <strong>Legacy Server Key</strong> أو <strong>OAuth Access Token</strong>:
          </p>
          
          <div className="flex gap-3">
            <input 
              type="password" 
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              placeholder="AIza... (Legacy) OR ya29... (Token)"
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-left font-mono text-sm"
              dir="ltr"
            />
            <button 
              onClick={handleSaveKey}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              حفظ
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
                        <li>أضف ملف <code>google-services.json</code> إلى مجلد <code>android/app/</code>.</li>
                        <li>شغل التطبيق: <code>flutter run</code>.</li>
                    </ol>
                </div>
             </div>
        </div>
        
      </div>
    </div>
  );
};