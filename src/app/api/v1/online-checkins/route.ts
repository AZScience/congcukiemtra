import { NextResponse } from 'next/server';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const getDb = async () => {
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    const db = getFirestore(app);
    return db;
};

// Xử lý Preflight request (CORS)
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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const db = await getDb();

        // Lưu thông tin check-in vào collection 'online_checkins'
        const docRef = await addDoc(collection(db, 'online_checkins'), {
            ...body,
            serverTimestamp: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

        return NextResponse.json({ 
            success: true, 
            id: docRef.id 
        }, {
            headers: { 
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            }
        });
    } catch (error: any) {
        return NextResponse.json({ 
            success: false, 
            message: error.message 
        }, {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
}
