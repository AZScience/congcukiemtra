import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const apps = getApps();
export const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);

let dbInstance;
try {
  dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch (e) {
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
