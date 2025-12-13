import { db } from './firebase';
import { collection, getDocs, doc, writeBatch, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Student, AttendanceStatus } from '../types';
import { MOCK_STUDENTS } from './mockData';

const STUDENTS_COLLECTION = 'students';

// Fetch students primarily from Firestore. 
export const getStudents = async (): Promise<Student[]> => {
  try {
    const studentsCol = collection(db, STUDENTS_COLLECTION);
    const querySnapshot = await getDocs(studentsCol);
    
    if (querySnapshot.empty) {
      console.log('No students found in Firestore.');
      return [];
    }
    
    return querySnapshot.docs.map(doc => doc.data() as Student);
  } catch (error: any) {
    console.warn("Firestore access failed. Falling back to MOCK data.", error);
    return MOCK_STUDENTS;
  }
};

// Real-time subscription
export const subscribeToStudents = (onData: (students: Student[]) => void): (() => void) => {
  const studentsCol = collection(db, STUDENTS_COLLECTION);
  const unsubscribe = onSnapshot(studentsCol, (snapshot) => {
    const students = snapshot.docs.map(doc => doc.data() as Student);
    onData(students);
  }, (error) => {
    console.error("Error watching students:", error);
  });
  return unsubscribe;
};

// NEW: Update Student Attendance Status in Firestore
export const updateStudentStatusInDb = async (studentCode: string, status: AttendanceStatus): Promise<void> => {
  try {
    const studentRef = doc(db, STUDENTS_COLLECTION, studentCode);
    
    // Create update object dynamically to avoid sending 'undefined' which crashes Firestore
    const updates: Record<string, any> = { status };
    
    // If status is changed back to Present, reset the notification flag
    if (status === 'Present') {
        updates.notificationSent = false;
    }
    
    await updateDoc(studentRef, updates);
  } catch (error) {
    console.error(`Failed to update status for ${studentCode}:`, error);
    throw error;
  }
};

// NEW: Mark Notification as Sent in Firestore
export const markNotificationAsSentInDb = async (studentCode: string): Promise<void> => {
  try {
    const studentRef = doc(db, STUDENTS_COLLECTION, studentCode);
    await updateDoc(studentRef, { 
        notificationSent: true 
    });
  } catch (error) {
    console.error(`Failed to mark notification for ${studentCode}:`, error);
    throw error;
  }
};

export const seedDatabase = async (): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    MOCK_STUDENTS.forEach(student => {
      const docRef = doc(db, STUDENTS_COLLECTION, student.studentCode);
      batch.set(docRef, student);
    });

    await batch.commit();
    console.log("Database seeded with mock students");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
};

export const syncSheetToFirestore = async (): Promise<string> => {
    try {
        const sheetStudents = await fetchStudentsFromGoogleSheet();
        if (sheetStudents.length === 0) throw new Error("Google Sheet is empty or unreadable.");

        const batch = writeBatch(db);
        let updatedCount = 0;

        for (const sheetStudent of sheetStudents) {
            const code = sheetStudent.studentCode.trim().toUpperCase();
            const studentRef = doc(db, STUDENTS_COLLECTION, code);
            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {
                const existingData = studentSnap.data() as Student;
                const mergedData = {
                    ...sheetStudent,
                    studentCode: code,
                    fcmToken: existingData.fcmToken || sheetStudent.fcmToken || '', 
                    status: existingData.status || 'Present', // Keep existing status
                    notificationSent: existingData.notificationSent || false
                };
                batch.set(studentRef, mergedData);
            } else {
                batch.set(studentRef, { ...sheetStudent, studentCode: code });
            }
            updatedCount++;
        }

        await batch.commit();
        return `Synced ${updatedCount} students from Google Sheet to Firestore successfully.`;
    } catch (error) {
        console.error("Sync failed:", error);
        throw error;
    }
};

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

export const fetchStudentsFromGoogleSheet = async (): Promise<Student[]> => {
  const SHEET_ID = '10BzoAxaSy-qnD95M51MsH2hYVen26bBQ97VbVkiyhDM';
  const GID = '1557759614';
  const TARGET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

  try {
    const response = await fetch(TARGET_URL, {
        method: 'GET',
        credentials: 'omit',
        redirect: 'follow',
    });

    if (!response.ok) {
       throw new Error(`Failed to fetch data (Status: ${response.status}).`);
    }

    const textData = await response.text();

    if (textData.trim().toLowerCase().startsWith('<!doctype html') || textData.includes('<html')) {
        throw new Error("Google Sheet returned HTML. Please ensure the Sheet is 'Published to the web'.");
    }

    return parseCSV(textData);

  } catch (error) {
    console.error("Google Sheet Fetch Error:", error);
    throw error;
  }
};

const parseCSV = (text: string): Student[] => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
  const normalize = (h: string) => h.replace(/[^a-z0-9]/g, '');
  
  const findIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => normalize(h).includes(normalize(k))));

  const idxCode = findIdx(['id', 'code']);
  const idxName = findIdx(['name', 'student']);
  const idxGrade = findIdx(['grade']);
  const idxClass = findIdx(['student classroom', 'classroom', 'class', 'section']);
  const idxPName = findIdx(['parent', 'father', 'mother']);
  const idxPhone = findIdx(['phone', 'mobile']);
  
  const splitCSVLine = (line: string) => {
    const result = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            inQuotes = !inQuotes;
        } else if (line[i] === ',' && !inQuotes) {
            result.push(line.substring(start, i).replace(/^"|"$/g, '').replace(/""/g, '"').trim());
            start = i + 1;
        }
    }
    result.push(line.substring(start).replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    return result;
  };

  return lines.slice(1).map((line, index) => {
     const data = splitCSVLine(line);
     if (data.length < 2) return null;

     let grade = idxGrade > -1 ? data[idxGrade] : '1';
     let className = idxClass > -1 ? data[idxClass] : '1';

     if (className && /[-/.]/.test(className)) {
         const parts = className.split(/[-/.]/);
         if (parts.length >= 2) {
             grade = parts[0].trim();
             className = parts[1].trim();
         }
     }

     const code = (idxCode > -1 && data[idxCode]) ? data[idxCode] : `GS-${1000 + index}`;

     return {
        studentCode: code.trim().toUpperCase(),
        studentName: (idxName > -1 && data[idxName]) ? data[idxName] : 'Unknown Student',
        grade: grade || '1',
        className: className || '1',
        parentName: (idxPName > -1 && data[idxPName]) ? data[idxPName] : '',
        parentPhone: (idxPhone > -1 && data[idxPhone]) ? data[idxPhone] : '',
        fcmToken: '', 
        status: 'Present',
        notificationSent: false
     } as Student;
  }).filter((s): s is Student => s !== null);
};