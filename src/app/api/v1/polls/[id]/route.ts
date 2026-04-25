import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

const getDb = async () => {
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error("Auth failed:", e);
        }
    }
    
    return db;
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = await getDb();
        const docRef = doc(db, 'polls', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return NextResponse.json({ 
                success: false, 
                message: `Không tìm thấy bình chọn với ID: ${id}. Vui lòng kiểm tra lại Firestore.`,
                id_checked: id
            }, { 
                status: 404,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        return NextResponse.json({ success: true, data: { id: docSnap.id, ...docSnap.data() } }, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { 
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { optionIndex, voterName, voterEmail } = await request.json();
        const db = await getDb();

        const docRef = doc(db, 'polls', id);
        
        if (voterEmail) {
            // Use Email as primary key to prevent spoofing (1 account = 1 vote)
            await updateDoc(docRef, {
                [`voters.${voterEmail.replace(/\./g, '_')}`]: {
                    name: voterName,
                    index: optionIndex,
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            // Legacy/Fallback logic
            await updateDoc(docRef, {
                [`votes.${optionIndex}`]: increment(1)
            });
        }

        return NextResponse.json({ success: true }, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    } catch (error: any) {
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
            'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
    });
}
