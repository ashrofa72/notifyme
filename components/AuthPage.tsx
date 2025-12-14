import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Lock, Mail, Loader2, AlertCircle, User, LogIn, UserPlus } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Save the full name to the user's profile
        if (fullName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: fullName.trim()
          });
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "حدث خطأ غير متوقع.";
      const errorCode = err.code;
      const errorMessage = err.message;
      
      // Detailed Error Mapping
      if (
        errorCode === 'auth/invalid-credential' || 
        errorCode === 'auth/wrong-password' || 
        errorCode === 'auth/user-not-found'
      ) {
        msg = "بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور، أو أنشئ حساباً جديداً إذا لم يكن لديك حساب.";
      } else if (errorCode === 'auth/email-already-in-use') {
        msg = "البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من إنشاء حساب.";
      } else if (errorCode === 'auth/weak-password') {
        msg = "كلمة المرور ضعيفة. يجب أن تكون 6 أحرف على الأقل.";
      } else if (errorCode === 'auth/invalid-email') {
        msg = "صيغة البريد الإلكتروني غير صحيحة.";
      } else if (errorCode === 'auth/network-request-failed') {
        msg = "خطأ في الاتصال. يرجى التحقق من اتصال الإنترنت.";
      } else if (errorCode === 'auth/too-many-requests') {
        msg = "تم حظر الدخول مؤقتاً بسبب تكرار المحاولات الفاشلة. حاول مرة أخرى لاحقاً.";
      } else if (errorMessage.includes('internal-error')) {
         msg = "خطأ داخلي في Firebase. تحقق من إعدادات المشروع (API Key/Auth).";
      }
      
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    // Clear password when switching modes for security/UX
    setPassword(''); 
    if (!isLogin) setFullName(''); 
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">AlzahraaConnection</h1>
          <p className="text-blue-100">نظام الحضور والإشعارات المدرسي</p>
        </div>

        <div className="p-8">
          <div className="flex justify-center mb-6">
             <div className="bg-blue-50 p-3 rounded-full">
                {isLogin ? <LogIn className="w-8 h-8 text-blue-600" /> : <UserPlus className="w-8 h-8 text-blue-600" />}
             </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <div className="relative">
                  <User className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required={!isLogin}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="الاسم الكامل"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="name@school.edu"
                  dir="ltr" 
                  style={{ textAlign: 'right' }} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center shadow-md hover:shadow-lg transform active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-2">
                {isLogin ? "هل أنت مستخدم جديد؟" : "هل لديك حساب بالفعل؟"}
            </p>
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-all"
            >
              {isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};