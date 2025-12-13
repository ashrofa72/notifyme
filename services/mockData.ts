import { Student, ClassOption, NotificationLog } from '../types';

export const MOCK_CLASSES: ClassOption[] = [
  // Grade 1
  { grade: '1', className: '1' },
  { grade: '1', className: '2' },
  { grade: '1', className: '3' },
  { grade: '1', className: '4' },
  { grade: '1', className: '5' },
  // Grade 2
  { grade: '2', className: '1' },
  { grade: '2', className: '2' },
  { grade: '2', className: '3' },
  { grade: '2', className: '4' },
  { grade: '2', className: '5' },
  // Grade 3
  { grade: '3', className: '1' },
  { grade: '3', className: '2' },
  { grade: '3', className: '3' },
  { grade: '3', className: '4' },
  { grade: '3', className: '5' },
];

export const MOCK_STUDENTS: Student[] = [
  {
    studentCode: 'S1001',
    studentName: 'Ahmed Ali',
    grade: '1',
    className: '1',
    parentName: 'Mohamed Ali',
    parentPhone: '+971500000001',
    fcmToken: 'token_ahmed_123',
    status: 'Present',
    notificationSent: false,
  },
  {
    studentCode: 'S1002',
    studentName: 'Sara Khan',
    grade: '1',
    className: '1',
    parentName: 'Yusuf Khan',
    parentPhone: '+971500000002',
    fcmToken: 'token_sara_456',
    status: 'Present',
    notificationSent: false,
  },
  {
    studentCode: 'S1003',
    studentName: 'John Doe',
    grade: '1',
    className: '2',
    parentName: 'Jane Doe',
    parentPhone: '+971500000003',
    fcmToken: 'token_john_789',
    status: 'Present',
    notificationSent: false,
  },
  {
    studentCode: 'S1101',
    studentName: 'Fatima Omar',
    grade: '2',
    className: '1',
    parentName: 'Omar Hassan',
    parentPhone: '+971500000004',
    fcmToken: 'token_fatima_101',
    status: 'Present',
    notificationSent: false,
  },
  {
    studentCode: 'S1102',
    studentName: 'Chen Wei',
    grade: '2',
    className: '1',
    parentName: 'Li Wei',
    parentPhone: '+971500000005',
    fcmToken: 'token_chen_102',
    status: 'Present',
    notificationSent: false,
  },
  {
    studentCode: 'S1201',
    studentName: 'Layla Mahmoud',
    grade: '3',
    className: '5',
    parentName: 'Mahmoud Ibrahim',
    parentPhone: '+971500000006',
    fcmToken: 'token_layla_103',
    status: 'Present',
    notificationSent: false,
  },
];

export const INITIAL_LOGS: NotificationLog[] = [
  {
    id: 'log-1',
    studentName: 'Ahmed Ali',
    studentCode: 'S1001',
    type: 'Absent',
    timestamp: new Date(Date.now() - 86400000).toLocaleString(), // Yesterday
    status: 'Sent',
    message: 'Your child Ahmed Ali is absent today.',
  },
];