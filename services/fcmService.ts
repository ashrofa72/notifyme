import { Student, NotificationLog } from '../types';

export const getStoredServerKey = () => localStorage.getItem('FCM_SERVER_KEY') || '';
export const setStoredServerKey = (key: string) => localStorage.setItem('FCM_SERVER_KEY', key);

// List of CORS proxies to try in order of reliability
const PROXY_GENERATORS = [
    // 1. corsproxy.io - Standard reliable proxy
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // 2. AllOrigins - Good backup (Raw mode)
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // 3. ThingProxy - Fallback
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

export const sendFCMNotification = async (student: Student): Promise<NotificationLog> => {
  const serverKey = getStoredServerKey();
  
  const title = "تنبيه حضور - مدرسة الزهراء";
  const body = student.status === 'Absent' 
    ? `تنبيه: ابنكم ${student.studentName} غائب اليوم.` 
    : `تنبيه: وصل ابنكم ${student.studentName} متأخراً اليوم.`;

  const notificationId = crypto.randomUUID();
  const timestamp = new Date().toLocaleString('ar-EG');

  // 1. Validation
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

  // 2. Simulation Mode
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
    notification: { title, body },
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
    let response: Response | undefined;
    let lastErrorMsg = "";
    
    console.log("Sending FCM notification via proxies...");
        
    for (const generateProxyUrl of PROXY_GENERATORS) {
        try {
            const proxyUrl = generateProxyUrl(FCM_ENDPOINT);
            const res = await performFetch(proxyUrl);
            
            const status = res.status;
            const contentType = res.headers.get("content-type") || "";
            
            // CRITICAL: Filter out Proxy Errors
            // If the proxy returns HTML (like 404 Not Found page, or 502 Bad Gateway page), 
            // it is NOT a response from Firebase. We must SKIP it and try the next proxy.
            const isJson = contentType.includes("json");
            const isHtml = contentType.includes("html");
            
            // Scenario 1: Success (200 OK)
            if (res.ok) {
                response = res;
                break;
            }

            // Scenario 2: Auth Error (401). This comes from Firebase, so it's a "valid" failure. Stop loop.
            if (status === 401) {
                response = res;
                break;
            }

            // Scenario 3: Real Firebase Error (400/404/500 but with JSON body)
            if (isJson) {
                response = res;
                break;
            }

            // Scenario 4: Proxy Error (HTML page, text, or weird 404/502 from proxy middleware)
            // We ignore this response and try the next proxy.
            console.warn(`Proxy ${proxyUrl} returned invalid response [${status}] (${contentType}). Skipping.`);
            lastErrorMsg = `Proxy Error ${status}`;
            
            // Add small delay before hitting next proxy
            await new Promise(r => setTimeout(r, 200));

        } catch (proxyError: any) {
            console.warn("Proxy connection attempt failed:", proxyError);
            lastErrorMsg = proxyError.message;
        }
    }

    // If loop finishes and we still don't have a valid response object
    if (!response) {
        throw new Error(`تعذر الاتصال بخادم Firebase. جميع الوسطاء مشغولون حالياً. (${lastErrorMsg})`);
    }

    if (response.status === 401) {
        throw new Error("401 Unauthorized: المفتاح خطأ أو خدمة (Legacy API) غير مفعلة في Cloud Console.");
    }

    if (!response.ok) {
        const text = await response.text();
        // Double check: If it's HTML error that slipped through
        if (text.trim().startsWith("<")) {
             throw new Error("خطأ من الوسيط (Proxy): استجابة غير صحيحة (HTML). حاول مرة أخرى.");
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
        userMessage = "خطأ شبكة: تعذر الاتصال بالإنترنت.";
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