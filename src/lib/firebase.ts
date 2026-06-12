import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const apps = getApps();
export const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);

let dbInstance;
try {
  dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch (e) {
  dbInstance = getFirestore(app);
}

if (process.env.NODE_ENV === 'development') {
  try {
    connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
    console.log("Connected to Firestore Emulator on port 8080");
  } catch (err) {
    // Ignore already connected error
  }
}

export const db = dbInstance;
