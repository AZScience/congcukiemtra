import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const getDb = async () => {
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    return getFirestore(app);
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
    });
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!id) return NextResponse.json(
        { success: false, message: "Thiếu ID" },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );

    try {
        const db = await getDb();
        const docRef = doc(db, 'online_checkins', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy báo cáo" },
                { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        return NextResponse.json(
            { success: true, data: { id: docSnap.id, ...docSnap.data() } },
            { headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
}
