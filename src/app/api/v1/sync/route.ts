import { NextResponse } from 'next/server';
import { authenticateApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

import { db } from '@/lib/firebase';
const getDb = () => db;

export async function POST(request: Request) {
    // 1. Xác thực API Key
    if (!authenticateApiKey(request)) {
        return unauthorizedResponse();
    }

    try {
        const body = await request.json();
        
        // 2. Kiểm tra định dạng payload
        if (!body.type || !body.data || !Array.isArray(body.data)) {
            return NextResponse.json({ 
                success: false, 
                message: 'Invalid payload format. Expected { type: "students" | "lecturers" | "schedules", data: array }' 
            }, { status: 400 });
        }

        const db = getDb();
        const batch = writeBatch(db);
        let count = 0;

        // 3. Xác định Collection sẽ lưu trữ
        const collectionName = body.type === 'students' ? 'students' : 
                               body.type === 'lecturers' ? 'lecturers' : 
                               body.type === 'schedules' ? 'schedules' : null;

        if (!collectionName) {
            return NextResponse.json({ 
                success: false, 
                message: 'Unsupported sync type. Allowed types: students, lecturers, schedules.' 
            }, { status: 400 });
        }

        // 4. Batch write để tối ưu hóa hiệu suất Firestore
        for (const item of body.data) {
            if (!item.id) continue;
            
            const docRef = doc(collection(db, collectionName), String(item.id));
            batch.set(docRef, {
                ...item,
                updatedAt: new Date().toISOString(),
                syncSource: 'external_api'
            }, { merge: true }); // Dùng merge để không ghi đè mất các trường khác nếu có
            
            count++;
            
            // Firebase Batch giới hạn 500 thao tác mỗi lần commit
            if (count % 500 === 0) {
                await batch.commit();
            }
        }

        // Cập nhật các bản ghi còn lại
        if (count % 500 !== 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            message: `Successfully synchronized ${count} items to ${collectionName}.`
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
