import React, { useState, useEffect } from 'react';
import { Save, Database, Key } from 'lucide-react';
import { getStoredServerKey, setStoredServerKey } from '../services/fcmService';
import { seedDatabase } from '../services/dataService';

export const SettingsView: React.FC = () => {
  const [serverKey, setServerKey] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    setServerKey(getStoredServerKey());
  }, []);

  const handleSaveKey = () => {
    setStoredServerKey(serverKey);
    alert('تم حفظ مفتاح الخادم بنجاح!');
  };

  const handleSeed = async () => {
    if (confirm("سيتم الكتابة فوق/إضافة بيانات طلاب تجريبية إلى قاعدة بيانات Firestore. هل تريد المتابعة؟")) {
      setIsSeeding(true);
      try {
        await seedDatabase();
        alert('تمت إضافة البيانات بنجاح! يرجى تحديث الصفحة لرؤية التغييرات.');
      } catch (e) {
        alert('حدث خطأ أثناء إضافة البيانات. راجع وحدة التحكم (Console).');
        console.error(e);
      } finally {
        setIsSeeding(false);
      }
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">إعدادات النظام</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-8">
        
        {/* Server Key Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            إعدادات Firebase Cloud Messaging (FCM)
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            أدخل <strong>مفتاح الخادم (Server Key)</strong> الخاص بمشروع Firebase لتفعيل الإشعارات الحقيقية.
            يمكنك العثور عليه في Firebase Console {'>'} Project Settings {'>'} Cloud Messaging.
          </p>
          
          <div className="flex gap-3">
            <input 
              type="password" 
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              placeholder="أدخل مفتاح الخادم (مثال: AizaSy...)"
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-left"
              dir="ltr"
            />
            <button 
              onClick={handleSaveKey}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              حفظ المفتاح
            </button>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            ملاحظة: بدون هذا المفتاح، سيقوم التطبيق بمحاكاة الإشعارات (وضع تجريبي).
          </p>
        </div>

        <div className="border-t border-gray-100"></div>

        {/* Database Section */}
        <div>
           <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            إدارة قاعدة البيانات
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            تهيئة قاعدة البيانات ببيانات طلاب تجريبية لأغراض الاختبار.
          </p>
          
          <button 
            onClick={handleSeed}
            disabled={isSeeding}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition flex items-center gap-2 border border-gray-300"
          >
            <Database className={`w-4 h-4 ${isSeeding ? 'animate-pulse' : ''}`} />
            {isSeeding ? 'جاري المعالجة...' : 'إضافة بيانات تجريبية (Seed Data)'}
          </button>
        </div>
        
      </div>
    </div>
  );
};