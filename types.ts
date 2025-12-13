export type AttendanceStatus = 'Present' | 'Absent' | 'Late';

export interface Student {
  studentCode: string;
  studentName: string;
  grade: string;
  className: string;
  parentName: string;
  parentPhone: string;
  fcmToken: string;
  status: AttendanceStatus;
  notificationSent: boolean; // UI state to track if we already alerted today
}

export interface NotificationLog {
  id: string;
  studentName: string;
  studentCode: string;
  type: 'Absent' | 'Late';
  timestamp: string;
  status: 'Sent' | 'Failed';
  message: string;
}

export interface ClassOption {
  grade: string;
  className: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  ATTENDANCE = 'ATTENDANCE',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
}