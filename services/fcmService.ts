import { Student, NotificationLog } from '../types';

export const getStoredServerKey = () => localStorage.getItem('FCM_SERVER_KEY') || '';
export const setStoredServerKey = (key: string) => localStorage.setItem('FCM_SERVER_KEY', key);

// List of CORS proxies to try in order
const PROXY_GENERATORS = [
    // Primary: corsproxy.io (Fast, usually reliable)
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // Backup: thingproxy (Reliable fallback)
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

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

  const performFetch = async (url: string) => {
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
    let successfulProxy = false;

    // Attempt 1: Direct Fetch (Will likely fail with CORS in browser, but good to try)
    try {
        response = await performFetch(FCM_ENDPOINT);
    } catch (e) {
        // Expected CORS error
    }

    // Attempt 2: Try Proxies Loop
    if (!response || !response.ok) {
        console.log("Direct fetch failed or blocked. Trying proxies...");
        
        for (const generateProxyUrl of PROXY_GENERATORS) {
            try {
                const proxyUrl = generateProxyUrl(FCM_ENDPOINT);
                response = await performFetch(proxyUrl);
                
                // If we get a 404 HTML page, treat it as a proxy failure, not an API failure
                if (response.status === 404) {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("html")) {
                        console.warn(`Proxy ${proxyUrl} returned HTML 404 (Service Down). Trying next...`);
                        continue; 
                    }
                }

                if (response.ok) {
                    successfulProxy = true;
                    break; // Success! Stop looping.
                }
            } catch (proxyError) {
                console.warn("Proxy attempt failed:", proxyError);
            }
        }
    }

    if (!response) {
        throw new Error("Network Error: Could not reach Firebase via any proxy.");
    }

    if (!response.ok) {
        const text = await response.text();
        // Check if the response is the HTML 404 from a proxy
        if (text.includes("<!DOCTYPE html") || text.includes("Not Found")) {
            throw new Error("Proxy Error: The proxy service is down or blocked. Please try again later.");
        }
        throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    if (data.failure > 0) {
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

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        userMessage = "خطأ شبكة: تعذر الاتصال. يرجى التحقق من الإنترنت.";
    } else if (userMessage.includes('InvalidRegistration')) {
        userMessage = "الرمز (Token) غير صالح أو منتهي الصلاحية.";
    } else if (userMessage.includes('Unauthorized') || userMessage.includes('401')) {
        userMessage = "مفتاح الخادم (Server Key) غير صحيح.";
    } else if (userMessage.includes('Proxy Error')) {
        userMessage = "خدمة الوسيط (Proxy) مشغولة حالياً. يرجى المحاولة مرة أخرى.";
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