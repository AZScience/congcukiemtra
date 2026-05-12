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
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
      firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        experimentalForceLongPolling: true
      });
    } else {
      firestore = initializeFirestore(app, {
        experimentalForceLongPolling: true
      });
    }
  } catch (e: any) {
    console.warn("Firestore initialization warning (falling back to default):", e.message);
    try {
      firestore = initializeFirestore(app, { experimentalForceLongPolling: true });
    } catch {
      firestore = getFirestore(app);
    }
  }
  
  const storage = getStorage(app, config.storageBucket);

  firebaseInstance = { app, auth, firestore, storage };
  return firebaseInstance;
}
