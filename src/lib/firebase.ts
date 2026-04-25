import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const apps = getApps();
export const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
