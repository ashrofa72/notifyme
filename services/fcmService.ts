import { Student, NotificationLog } from '../types';
import { messaging } from './firebase';
import { getToken } from 'firebase/messaging';

export const getStoredServerKey = () => localStorage.getItem('FCM_SERVER_KEY') || '';
export const setStoredServerKey = (key: string) => localStorage.setItem('FCM_SERVER_KEY', key);

// The Project ID from your Service Account JSON
const PROJECT_ID = 'notify-me-efcdf';

// New function to generate token for current browser (Parent Simulator)
export const requestBrowserToken = async (): Promise<string | null> => {
  if (!('Notification' in window)) {
    alert("هذا المتصفح لا يدعم الإشعارات.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      
      // 1. Explicitly Register Service Worker to ensure it exists
      let swRegistration;
      try {
        // We register the file we created in public/firebase-messaging-sw.js
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker Registered successfully:', swRegistration);
      } catch (swError) {
        console.warn('Service Worker registration failed or already active. Proceeding...', swError);
      }

      // 2. Get Token with VAPID Key and SW Registration
      // Note: In a real production app, ensure your VAPID key matches your Firebase Console -> Cloud Messaging -> Web Push Certificates
      try {
        const token = await getToken(messaging, {
          vapidKey: "BLmZk85aE-Cq9yYj5E_w49bF6E8dF7cHG-I1j2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8",
          serviceWorkerRegistration: swRegistration
        });
        
        console.log("Generated Token:", token);
        return token;
      } catch (tokenError: any) {
         console.warn("GetToken with VAPID failed, trying fallback...", tokenError);
         
         // 3. Fallback: Try without VAPID (sometimes works depending on project config)
         try {
            return await getToken(messaging, { serviceWorkerRegistration: swRegistration });
         } catch (fallbackError: any) {
             console.error("FCM Token Error:", fallbackError);
             
             if (fallbackError.code === 'messaging/unsupported-browser' || fallbackError.message?.includes('secure context')) {
                 alert("خطأ: يتطلب Firebase Messaging سياقاً آمناً (HTTPS) أو Localhost.");
             } else if (fallbackError.code === 'messaging/failed-service-worker-registration') {
                 alert("خطأ: لم يتم العثور على ملف firebase-messaging-sw.js في المجلد العام.");
             } else {
                 alert(`فشل توليد الرمز: ${fallbackError.message}`);
             }
             return null;
         }
      }
    } else {
      console.warn('Notification permission denied.');
      alert("تم رفض إذن الإشعارات. يرجى تفعيله من إعدادات المتصفح.");
      return null;
    }
  } catch (error) {
    console.error('Error getting browser token:', error);
    throw error;
  }
};

export const sendFCMNotification = async (student: Student): Promise<NotificationLog> => {
  const keyOrToken = getStoredServerKey();
  
  // Determine message body based on status
  const title = "تنبيه حضور - مدرسة الزهراء";
  const body = student.status === 'Absent' 
    ? `تنبيه: ابنكم ${student.studentName} غائب اليوم.` 
    : `تنبيه: وصل ابنكم ${student.studentName} متأخراً اليوم.`;

  const notificationId = crypto.randomUUID();
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
  // Legacy Keys usually start with AIza...
  // OAuth Tokens (v1) usually start with ya29...
  const isV1Token = keyOrToken.startsWith('ya29');

  try {
    let response;
    
    if (isV1Token) {
      // --- HTTP v1 API (Modern) ---
      // Requires: OAuth 2.0 Access Token
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
      // Requires: Server Key (starts with AIza)
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
        userMessage = "خطأ شبكة/CORS: المتصفح منع الاتصال. تأكد من إعدادات الشبكة.";
    } else if (userMessage.includes('UNAUTHENTICATED') || userMessage.includes('401')) {
        userMessage = isV1Token 
            ? "الرمز (Access Token) منتهي الصلاحية. يرجى توليد رمز جديد."
            : "مفتاح الخادم (Legacy Key) غير صحيح.";
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