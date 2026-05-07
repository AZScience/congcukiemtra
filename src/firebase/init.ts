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
    // Attempt to initialize with specific settings
    firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      // @ts-ignore - Some versions need this to avoid conflicting with forceLongPolling
      experimentalAutoDetectLongPolling: false,
      // @ts-ignore - newer firebase versions support this to fix connectivity issues
      useFetchStreams: false,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e: any) {
    // If already initialized (common during HMR), use getFirestore
    // Note: Settings cannot be changed after initialization
    firestore = getFirestore(app);
  }
  
  const storage = getStorage(app, `gs://${config.storageBucket}`);

  firebaseInstance = { app, auth, firestore, storage };
  return firebaseInstance;
}
