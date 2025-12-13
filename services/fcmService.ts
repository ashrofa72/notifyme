import { Student, NotificationLog } from '../types';

export const getStoredServerKey = () => localStorage.getItem('FCM_SERVER_KEY') || '';
export const setStoredServerKey = (key: string) => localStorage.setItem('FCM_SERVER_KEY', key);

// The Project ID from your Service Account JSON
const PROJECT_ID = 'notify-me-efcdf';

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