import { db } from './firebase';
import { collection, getDocs, doc, writeBatch, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Student } from '../types';
import { MOCK_STUDENTS } from './mockData';

const STUDENTS_COLLECTION = 'students';

// Fetch students primarily from Firestore. 
// This is the Source of Truth because it contains the FCM Tokens written by the Parent App.
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

// NEW: Real-time subscription to ensure Admin UI updates immediately when a parent links a device
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

// New Function: Reads Google Sheet and updates Firestore
// It PRESERVES existing Tokens if a parent has already registered.
export const syncSheetToFirestore = async (): Promise<string> => {
    try {
        // 1. Fetch fresh roster from Google Sheets
        const sheetStudents = await fetchStudentsFromGoogleSheet();
        if (sheetStudents.length === 0) throw new Error("Google Sheet is empty or unreadable.");

        const batch = writeBatch(db);
        let updatedCount = 0;

        // 2. Loop through every student from the sheet
        for (const sheetStudent of sheetStudents) {
            const code = sheetStudent.studentCode.trim().toUpperCase();
            const studentRef = doc(db, STUDENTS_COLLECTION, code);
            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {
                const existingData = studentSnap.data() as Student;
                // MERGE STRATEGY: Update name/class/phone, but KEEP the fcmToken if the parent has logged in via Mobile App
                const mergedData = {
                    ...sheetStudent,
                    studentCode: code,
                    fcmToken: existingData.fcmToken || sheetStudent.fcmToken || '', // Prefer existing token
                    status: existingData.status || 'Present' // Preserve attendance status if set today
                };
                batch.set(studentRef, mergedData);
            } else {
                // New Student
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
  // CONFIGURATION: Specific Google Sheet ID and GID provided by user
  const SHEET_ID = '10BzoAxaSy-qnD95M51MsH2hYVen26bBQ97VbVkiyhDM';
  const GID = '1557759614';
  
  // Use the export endpoint to get CSV data directly
  const TARGET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

  try {
    const response = await fetch(TARGET_URL, {
        method: 'GET',
        // 'omit' credentials is key for CORS requests to public sheets
        credentials: 'omit',
        redirect: 'follow',
    });

    if (!response.ok) {
       if (response.status === 404) {
           throw new Error("Google Sheet not found (404). Please check the SHEET_ID.");
       }
       throw new Error(`Failed to fetch data (Status: ${response.status}).`);
    }

    const contentType = response.headers.get("content-type");
    const textData = await response.text();

    // Check if we got an HTML login page or Error page instead of data
    if (textData.trim().toLowerCase().startsWith('<!doctype html') || textData.includes('<html')) {
        if (textData.includes("Not Found") || textData.includes("404")) {
             throw new Error("Google Sheet URL is incorrect or the sheet is deleted.");
        }
        throw new Error("Google Sheet returned HTML. Please ensure the Sheet is 'Published to the web' (File -> Share -> Publish to web) and accessible to anyone with the link.");
    }

    let jsonData;
    try {
        jsonData = JSON.parse(textData);
    } catch (e) {
        // Expected for CSV endpoint
        return parseCSV(textData);
    }

    // Fallback for JSON response (if we switch back to Apps Script later)
    const dataArray = Array.isArray(jsonData) ? jsonData : [];

    return dataArray.map((s: any) => {
        const keys = Object.keys(s);
        const findValue = (searchKeys: string[]) => {
            const foundKey = keys.find(k => searchKeys.some(sk => normalizeKey(k).includes(normalizeKey(sk))));
            return foundKey ? s[foundKey] : null;
        };

        let rawGrade = findValue(['grade']) || '1';
        let rawClass = findValue(['student classroom', 'classroom', 'class', 'section']) || '1';
        
        if (rawClass && /[-/.]/.test(String(rawClass))) {
            const parts = String(rawClass).split(/[-/.]/);
            if (parts.length >= 2) {
                const p0 = parts[0].trim();
                const p1 = parts[1].trim();
                if (p0) rawGrade = p0;
                if (p1) rawClass = p1;
            }
        }

        const studentName = findValue(['name', 'student']) || 'Unknown';
        const studentCode = findValue(['id', 'code']) || `GS-${Math.random().toString(36).substr(2, 9)}`;
        const parentName = findValue(['parent', 'father', 'mother']) || '';
        const parentPhone = findValue(['phone', 'mobile']) || '';
        const fcmToken = findValue(['token', 'fcm']) || '';

        return {
            studentCode: String(studentCode).trim().toUpperCase(),
            studentName: studentName,
            grade: String(rawGrade),
            className: String(rawClass),
            status: 'Present',
            notificationSent: false,
            fcmToken: fcmToken,
            parentPhone: String(parentPhone),
            parentName: parentName
        };
    });

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
        fcmToken: '', // Token is empty initially. Parent App must fill this.
        status: 'Present',
        notificationSent: false
     } as Student;
  }).filter((s): s is Student => s !== null);
};