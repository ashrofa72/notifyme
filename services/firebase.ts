import * as firebaseApp from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB69dA55hcFnFZIsIxCFccDMizTNPMuuwE",
  authDomain: "notify-me-efcdf.firebaseapp.com",
  projectId: "notify-me-efcdf",
  storageBucket: "notify-me-efcdf.firebasestorage.app",
  messagingSenderId: "136524070156",
  appId: "1:136524070156:web:ec5f1673ee64f164addd29"
};

// Initialize Firebase using Modular SDK
// Using type casting to avoid "Module has no exported member 'initializeApp'" error
// which can occur if strict type checking or conflicting types (@types/firebase) are present.
const app = (firebaseApp as any).initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);