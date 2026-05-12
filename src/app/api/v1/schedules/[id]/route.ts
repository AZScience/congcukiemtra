import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

import { db } from '@/lib/firebase';
const getDb = async () => db;

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

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, message: "Thiếu ID" }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });

    try {
        const db = await getDb();
        const { getDoc, doc } = await import('firebase/firestore');
        const docRef = doc(db, 'schedules', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return NextResponse.json({ success: false, message: "Không tìm thấy dữ liệu" }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        return NextResponse.json({ 
            success: true, 
            data: { id: docSnap.id, ...docSnap.data() } 
        }, { 
            headers: { 'Access-Control-Allow-Origin': '*' } 
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!id || id === "undefined" || id === "null") {
        return NextResponse.json({ 
            success: false, 
            message: "Thiếu ID lớp học hợp lệ (ID received: " + id + ")" 
        }, { 
            status: 400, 
            headers: { 'Access-Control-Allow-Origin': '*' } 
        });
    }

    try {
        const body = await request.json();
        const db = await getDb();

        const docRef = doc(db, 'schedules', id);
        
        await updateDoc(docRef, {
            ...body,
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true }, {
            headers: { 
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
            }
        });
    } catch (error: any) {
        console.error("PATCH API Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: error.message,
            stack: error.stack 
        }, {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
}
