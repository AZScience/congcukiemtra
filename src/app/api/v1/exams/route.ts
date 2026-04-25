import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

const getDb = async () => {
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error("Auth failed:", e);
        }
    }
    
    return getFirestore(app);
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
    });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const db = await getDb();
    
    // Lưu vào Firestore
    const docRef = await addDoc(collection(db, 'exams'), {
      ...data,
      createdAt: serverTimestamp(),
      active: true
    });

    return NextResponse.json({
      success: true,
      id: docRef.id
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    console.error('Create Exam Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
