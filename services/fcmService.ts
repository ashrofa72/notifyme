import { Student, NotificationLog } from '../types';
import { messaging } from './firebase';
import { getToken } from 'firebase/messaging';

// Storage helpers for Server Key (Legacy/OAuth) and VAPID Key (Web Push)
export const getStoredServerKey = () => localStorage.getItem('FCM_SERVER_KEY') || '';
export const setStoredServerKey = (key: string) => localStorage.setItem('FCM_SERVER_KEY', key);

export const getStoredVapidKey = () => localStorage.getItem('FCM_VAPID_KEY') || '';
export const setStoredVapidKey = (key: string) => localStorage.setItem('FCM_VAPID_KEY', key);

// The Project ID from your Service Account JSON
const PROJECT_ID = 'notify-me-efcdf';

// New function to generate token for current browser (Parent Simulator)
export const requestBrowserToken = async (): Promise<string | null> => {
  // 1. Check Browser Support
  if (!('Notification' in window)) {
    alert("هذا المتصفح لا يدعم الإشعارات.");
    return null;
  }

  try {
    // 2. Request Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert("تم رفض إذن الإشعارات. يرجى تفعيله من إعدادات المتصفح.");
      return null;
    }

    // 3. Register Service Worker Explicitly
    let swRegistration;
    try {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('SW Registered:', swRegistration);
    } catch (swError: any) {
      console.error('Service Worker registration failed:', swError);
      alert("فشل تسجيل Service Worker: " + swError.message);
      return null;
    }

    // 4. Get Token using VAPID Key if available
    const vapidKey = getStoredVapidKey();
    
    try {
      // Build options object
      const options: any = {
        serviceWorkerRegistration: swRegistration
      };
      
      // Only add vapidKey if it exists and looks valid (not empty)
      if (vapidKey && vapidKey.length > 10) {
        options.vapidKey = vapidKey;
      }

      const token = await getToken(messaging, options);
      
      console.log("Generated Token:", token);
      return token;

    } catch (tokenError: any) {
       console.error("FCM Token Error:", tokenError);
       
       // Handle specific "applicationServerKey not valid" error
       if (tokenError.message && (
           tokenError.message.includes('applicationServerKey is not valid') || 
           tokenError.message.includes('missing-multipart-messaging-sender-id')
       )) {
           alert("خطأ: مفتاح Web Push Certificate غير صالح أو مفقود.\n\nالحل: اذهب إلى صفحة 'الإعدادات' في هذا التطبيق وأدخل 'Web Push Certificate Key pair' الذي يمكنك الحصول عليه من Firebase Console.");
       } else if (tokenError.code === 'messaging/permission-blocked') {
           alert("الإشعارات محظورة. يرجى إعادة تعيين الأذونات للموقع.");
       } else if (tokenError.code === 'messaging/unsupported-browser') {
           alert("خطأ: يجب استخدام HTTPS أو Localhost لتشغيل الإشعارات.");
       } else {
           alert(`فشل توليد الرمز: ${tokenError.message}`);
       }
       return null;
    }
  } catch (error: any) {
    console.error('Unexpected error getting browser token:', error);
    alert("حدث خطأ غير متوقع: " + error.message);
    return null;
  }
};

export const sendFCMNotification = async (student: Student): Promise<NotificationLog> => {
  const keyOrToken = getStoredServerKey();
  
  // Determine message body based on status
  const title = "تنبيه حضور - مدرسة الزهراء";
  const body = student.status === 'Absent' 
    ? `تنبيه: ابنكم ${student.studentName} غائب اليوم.` 
    : `تنبيه: وصل ابنكم ${student.studentName} متأخراً اليوم.`;

  // Use a fallback for UUID if crypto is not available (older browsers/contexts)
  const notificationId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
  const timestamp = new Date().toLocaleString('ar-EG');

  // 1. Validation: Check if Token exists
  if (!student.fcmToken || student.fcmToken.length < 10) {
    return {
      id: notificationId,
      studentName: student.studentName,
      studentCode: student.studentCode,
      type: student.status === 'Absent' ? 'Absent' : 'Late',
      timestamp: timestamp,
      status: 'Failed',
      message: `فشل: لا يوجد رمز (Token) صالح لهذا الطالب.`,
    };
  }

  // 2. Simulation Mode (If no key)
  if (!keyOrToken) {
    console.warn("No FCM Key found. Simulating notification.");
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    return {
      id: notificationId,
      studentName: student.studentName,
      studentCode: student.studentCode,
      type: student.status === 'Absent' ? 'Absent' : 'Late',
      timestamp: timestamp,
      status: 'Sent',
      message: body + " (محاكاة - بدون مفتاح)",
    };
  }

  // 3. Determine API Version based on Key format
  const isV1Token = keyOrToken.startsWith('ya29');

  try {
    let response;
    
    if (isV1Token) {
      // --- HTTP v1 API (Modern) ---
      const v1Payload = {
        message: {
          token: student.fcmToken,
          notification: {
            title,
            body,
          },
          data: {
            studentCode: student.studentCode,
            status: student.status.toLowerCase(),
            click_action: "FLUTTER_NOTIFICATION_CLICK"
          }
        }
      };

      response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyOrToken}`
        },
        body: JSON.stringify(v1Payload)
      });

    } else {
      // --- Legacy HTTP API (Old) ---
      const legacyPayload = {
        to: student.fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          studentCode: student.studentCode,
          status: student.status.toLowerCase(),
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        }
      };

      response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${keyOrToken}`
        },
        body: JSON.stringify(legacyPayload)
      });
    }

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    // Check for Legacy API failure structure
    if (!isV1Token && data.failure > 0) {
       const errorType = data.results?.[0]?.error || "Unknown FCM Error";
       throw new Error(`Firebase Error: ${errorType}`);
    }

    // Success
    return {
      id: notificationId,
      studentName: student.studentName,
      studentCode: student.studentCode,
      type: student.status === 'Absent' ? 'Absent' : 'Late',
      timestamp: timestamp,
      status: 'Sent',
      message: body,
    };

  } catch (error: any) {
    console.error("Failed to send notification", error);
    
    let userMessage = error.message;

    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        userMessage = "تم حظر الاتصال (CORS). المتصفح يمنع إرسال الإشعارات مباشرة. للتجربة، احذف 'مفتاح الخادم' من الإعدادات لاستخدام وضع المحاكاة.";
    } else if (userMessage.includes('UNAUTHENTICATED') || userMessage.includes('401')) {
        userMessage = isV1Token 
            ? "الرمز (Access Token) منتهي الصلاحية. يرجى توليد رمز جديد."
            : "مفتاح الخادم (Server Key) غير صحيح.";
    }

    return {
      id: notificationId,
      studentName: student.studentName,
      studentCode: student.studentCode,
      type: student.status === 'Absent' ? 'Absent' : 'Late',
      timestamp: timestamp,
      status: 'Failed',
      message: `${userMessage}`,
    };
  }
};