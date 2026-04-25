import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

const getDb = async () => {
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    // Đảm bảo có auth context
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error("Auth failed:", e);
        }
    }
    
    return db;
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const db = await getDb();

        const docRef = await addDoc(collection(db, 'polls'), {
            ...body,
            votes: {}, 
            createdAt: new Date().toISOString(),
            status: 'active'
        });

        return NextResponse.json({ success: true, id: docRef.id }, {
            headers: { 
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
            }
        });
    } catch (error: any) {
        console.error("Poll creation error:", error);
        return NextResponse.json({ success: false, message: error.message }, { 
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
}

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
