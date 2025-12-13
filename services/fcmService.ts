import { Student, NotificationLog } from '../types';

export const getStoredServerKey = () => localStorage.getItem('FCM_SERVER_KEY') || '';
export const setStoredServerKey = (key: string) => localStorage.setItem('FCM_SERVER_KEY', key);

// List of CORS proxies to try in order of reliability
const PROXY_GENERATORS = [
    // 1. corsproxy.io - Usually the most stable
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // 2. ThingProxy - Good backup, can be busy
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
    // 3. CodeTabs - Another backup option
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
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
      message: `فشل: لا يوجد رمز (Token). يرجى ربط جهاز ولي الأمر.`,
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
    let lastErrorMsg = "";
    
    console.log("Sending FCM notification via proxies...");
        
    for (const generateProxyUrl of PROXY_GENERATORS) {
        try {
            const proxyUrl = generateProxyUrl(FCM_ENDPOINT);
            response = await performFetch(proxyUrl);
            
            // Handle Proxy-specific failures (HTML responses instead of JSON/API response)
            // 404 from a proxy often means the proxy service itself is glitching
            if (response.status === 404) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("html")) {
                    console.warn(`Proxy ${proxyUrl} returned 404 HTML. Skipping.`);
                    continue; 
                }
            }

            // 5xx errors (500, 502, 503, 504) are server errors. 
            // If the proxy returns this, we assume the proxy is down/busy and try the next one.
            if (response.status >= 500 && response.status < 600) {
                console.warn(`Proxy ${proxyUrl} failed with status ${response.status}. Trying next...`);
                continue;
            }
            
            // If we get 401 Unauthorized, that comes from Firebase itself (invalid key). 
            // No point trying other proxies.
            if (response.status === 401) {
                break;
            }

            // If we got a response that isn't a 5xx or broken 404, assume we connected to Firebase
            if (response) {
                break; 
            }
        } catch (proxyError: any) {
            console.warn("Proxy connection attempt failed:", proxyError);
            lastErrorMsg = proxyError.message;
            // Wait slightly before next try
            await new Promise(r => setTimeout(r, 500));
        }
    }

    if (!response) {
        throw new Error(`تعذر الاتصال بخادم Firebase عبر جميع الوسطاء المتاحين. (${lastErrorMsg})`);
    }

    if (response.status === 401) {
        throw new Error("401 Unauthorized: مفتاح الخادم (Legacy Server Key) خطأ. يرجى التأكد من الإعدادات.");
    }

    if (!response.ok) {
        const text = await response.text();
        // Check for specific proxy busy messages in text
        if (text.toLowerCase().includes("busy") || text.toLowerCase().includes("unavailable") || text.toLowerCase().includes("timeout")) {
             throw new Error("الوسيط (Proxy) مشغول حالياً. حاول مرة أخرى لاحقاً.");
        }
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
    }

    const data = await response.json();
    
    if (data.failure > 0) {
       const errorType = data.results?.[0]?.error || "Unknown FCM Error";
       if (errorType === "InvalidRegistration" || errorType === "NotRegistered") {
           throw new Error("الرمز (Token) غير صالح أو منتهي الصلاحية.");
       }
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
        userMessage = "خطأ شبكة: تعذر الاتصال بالإنترنت أو بخدمة الوسيط.";
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