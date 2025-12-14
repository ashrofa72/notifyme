import React, { useState, useEffect } from 'react';
import { Save, Database, Key, HelpCircle, Smartphone, Code, RefreshCw, ExternalLink } from 'lucide-react';
import { getStoredServerKey, setStoredServerKey } from '../services/fcmService';
import { seedDatabase, syncSheetToFirestore } from '../services/dataService';

export const SettingsView: React.FC = () => {
  const [serverKey, setServerKey] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

        {/* Step 3: Mobile App Instructions */}
        <div className="bg-green-50 border border-green-100 rounded-lg p-5">
             <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2 mb-3">
                 <Smartphone className="w-5 h-5" />
                 3. تطبيق الهاتف (Flutter App)
             </h3>
             <div className="text-sm text-green-800 space-y-4">
                <p>
                    يحتاج ولي الأمر لربط جهازه بالطالب لتلقي الإشعارات.
                </p>
                <div className="bg-white p-4 rounded border border-green-200">
                    <h4 className="font-bold flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4" />
                        طريقة الربط (Login Panel):
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                        <li>يقوم ولي الأمر بتحميل التطبيق وفتحه.</li>
                        <li>يظهر له "لوحة دخول" (Login Panel) تطلب كود الطالب.</li>
                        <li>يدخل "كود الطالب" (مثل <code>S1001</code>) ويضغط ربط.</li>
                        <li>يقوم التطبيق بإرسال الـ Token الخاص بالجهاز إلى قاعدة البيانات وربطه بهذا الطالب.</li>
                    </ol>
                </div>
             </div>
        </div>
        
      </div>
    </div>
  );
};
