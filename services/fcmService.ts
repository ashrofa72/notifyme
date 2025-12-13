import { Student, NotificationLog } from '../types';

export const getStoredServerKey = () => localStorage.getItem('FCM_SERVER_KEY') || '';
export const setStoredServerKey = (key: string) => localStorage.setItem('FCM_SERVER_KEY', key);

export const sendFCMNotification = async (student: Student): Promise<NotificationLog> => {
  const serverKey = getStoredServerKey();
  
  // Determine message body based on status
  const title = "Attendance Alert";
  const body = student.status === 'Absent' 
    ? `Your child ${student.studentName} is absent today.` 
    : `Your child ${student.studentName} arrived late today.`;

  const notificationId = crypto.randomUUID();
  const timestamp = new Date().toLocaleString();

  if (!serverKey) {
    console.warn("No FCM Server Key found. Simulating notification.");
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // Mock Success
    return {
      id: notificationId,
      studentName: student.studentName,
      studentCode: student.studentCode,
      type: student.status === 'Absent' ? 'Absent' : 'Late',
      timestamp: timestamp,
      status: 'Sent', // Assume success in mock mode
      message: body + " (Mock)",
    };
  }

  // Real FCM Logic (Legacy HTTP API)
  const payload = {
    to: student.fcmToken,
    notification: {
      title,
      body,
    },
    data: {
      studentCode: student.studentCode,
      status: student.status.toLowerCase(),
      click_action: "FLUTTER_NOTIFICATION_CLICK" // Common for Flutter apps
    }
  };

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${serverKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok && data.success > 0) {
       return {
        id: notificationId,
        studentName: student.studentName,
        studentCode: student.studentCode,
        type: student.status === 'Absent' ? 'Absent' : 'Late',
        timestamp: timestamp,
        status: 'Sent',
        message: body,
      };
    } else {
       console.error("FCM Error:", data);
       throw new Error(data.results?.[0]?.error || "Unknown FCM Error");
    }

  } catch (error) {
    console.error("Failed to send notification", error);
    return {
      id: notificationId,
      studentName: student.studentName,
      studentCode: student.studentCode,
      type: student.status === 'Absent' ? 'Absent' : 'Late',
      timestamp: timestamp,
      status: 'Failed',
      message: body,
    };
  }
};