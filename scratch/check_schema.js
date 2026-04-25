
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "...",
    authDomain: "nttu-audit.firebaseapp.com",
    projectId: "nttu-audit",
    storageBucket: "nttu-audit.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Note: I don't have the actual API key here, but I can check the local files for config.
