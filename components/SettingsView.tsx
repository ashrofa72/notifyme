import React, { useState, useEffect } from 'react';
import { Save, Database, Key, HelpCircle, ShieldAlert, RefreshCw, Smartphone, Code, AlertTriangle } from 'lucide-react';
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
          
          <div className="mt-3 mb-4 bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
             <h4 className="font-bold flex items-center gap-1 mb-1">
                 <AlertTriangle className="w-4 h-4" />
                 هام جداً:
             </h4>
             <p className="mb-2">
                 لا تستخدم "Web API Key" أو "App ID". يجب استخدام <strong>Cloud Messaging API (Legacy)</strong>.
             </p>
             <ol className="list-decimal list-inside space-y-1 text-yellow-700">
                 <li>اذهب إلى Firebase Console {'>'} Project Settings.</li>
                 <li>اختر تبويب <strong>Cloud Messaging</strong>.</li>
                 <li>إذا لم تجد "Cloud Messaging API (Legacy)"، اضغط على الثلاث نقاط في الزاوية واختر <strong>Manage API in Google Cloud Console</strong> ثم قم بتفعيلها.</li>
                 <li>انسخ المفتاح الطويل الذي يبدأ بـ <code>AIza...</code> وضعه هنا.</li>
             </ol>
          </div>
          
          <div className="flex gap-3">
            <input 
              type="password" 
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              placeholder="Legacy Server Key (Starts with AIza...)"
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-left"
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