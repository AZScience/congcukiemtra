import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

let firebaseInstance: { app: any; auth: any; firestore: any; storage: any } | null = null;

export function initializeFirebase(config: FirebaseOptions = firebaseConfig) {
  if (firebaseInstance) return firebaseInstance;

  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : initializeApp(config);
  const auth = getAuth(app);
  
  let firestore;
  try {
    // Attempt to initialize with specific settings to bypass network issues
    firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      // Disabling cache temporarily to fix potential corruption issues causing hangs
      // localCache: persistentLocalCache({
      //   tabManager: persistentMultipleTabManager()
      // })
    });
  } catch (e: any) {
    console.warn("Firestore initialization warning:", e.message);
    firestore = getFirestore(app);
  }
  
  const storage = getStorage(app, config.storageBucket);

  firebaseInstance = { app, auth, firestore, storage };
  return firebaseInstance;
}
