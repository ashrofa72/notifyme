import { Student, NotificationLog } from '../types';

export const getStoredServerKey = () => localStorage.getItem('FCM_SERVER_KEY') || '';
export const setStoredServerKey = (key: string) => localStorage.setItem('FCM_SERVER_KEY', key);

export const sendFCMNotification = async (student: Student): Promise<NotificationLog> => {
  const serverKey = getStoredServerKey();
  
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
      message: `فشل: لم يتم ربط جهاز ولي الأمر (لا يوجد Token).`,
    };
  }

  // 2. Simulation Mode (If no server key)
  if (!serverKey) {
    console.warn("No FCM Server Key found. Simulating notification.");
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

  // 3. Real FCM Logic
  const payload = {
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

  const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';

  const performFetch = async (useProxy: boolean) => {
    // Using corsproxy.io to bypass browser CORS restrictions for the Legacy HTTP API
    const url = useProxy 
      ? `https://corsproxy.io/?${encodeURIComponent(FCM_ENDPOINT)}` 
      : FCM_ENDPOINT;
      
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${serverKey}`
      },
      body: JSON.stringify(payload)
    });
  };

  try {
    let response;
    
    try {
        // Attempt 1: Direct Fetch
        response = await performFetch(false);
    } catch (networkError) {
        // Attempt 2: Fallback to Proxy if CORS/Network error occurs
        console.warn("Direct FCM fetch failed (likely CORS). Retrying with proxy...", networkError);
        response = await performFetch(true);
    }

    if (!response || !response.ok) {
        const text = response ? await response.text() : "Network Error";
        throw new Error(`HTTP ${response?.status || 'Failed'}: ${text}`);
    }

    const data = await response.json();
    
    if (data.failure > 0) {
       // Firebase accepted the request but failed to deliver to this specific token
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

    // Provide friendly error messages for common issues
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        userMessage = "خطأ شبكة/CORS: تعذر الاتصال بـ Firebase حتى عبر البروكسي. تأكد من الإنترنت.";
    } else if (userMessage.includes('InvalidRegistration')) {
        userMessage = "الرمز (Token) غير صالح أو منتهي الصلاحية.";
    } else if (userMessage.includes('Unauthorized') || userMessage.includes('401')) {
        userMessage = "مفتاح الخادم (Server Key) غير صحيح.";
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