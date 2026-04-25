import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const db = await getDb();
        
        const docRef = doc(db, 'exams', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return NextResponse.json({
                success: true,
                data: { id: docSnap.id, ...docSnap.data() }
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Không tìm thấy bài kiểm tra'
            }, { status: 404 });
        }
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: error.message
        }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
