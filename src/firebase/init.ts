import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

export function initializeFirebase(config: FirebaseOptions = firebaseConfig) {
  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : initializeApp(config);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  // Persistence should only be enabled once and as early as possible.
  // We use a global flag to prevent multiple attempts which can cause "Firestore already started" errors.
  if (typeof window !== 'undefined' && !(window as any).__FIREBASE_PERSISTENCE_STARTED__) {
    (window as any).__FIREBASE_PERSISTENCE_STARTED__ = true;
    enableIndexedDbPersistence(firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Firebase persistence: Multiple tabs open, only one tab can use persistence.');
        } else if (err.code === 'unimplemented') {
            console.warn('Firebase persistence: Browser does not support persistence.');
        } else {
            console.error('Firebase persistence error:', err);
        }
    });
  }

  return { app, auth, firestore, storage };
}
