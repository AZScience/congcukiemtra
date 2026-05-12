import { NextResponse } from 'next/server';
import { authenticateApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Timestamp, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

import { db } from '@/lib/firebase';
const getDb = async () => db;

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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const isExtensionSearch = searchParams.has('class');
    
    if (!isExtensionSearch && !authenticateApiKey(request)) {
        return unauthorizedResponse();
    }

    try {
        const rawClass = searchParams.get('class') || "";
        const rawDate = searchParams.get('date') || "";

        if (!rawDate) {
            return NextResponse.json({ success: false, message: "Thiếu tham số date" }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // [THỰC HIỆN TÌM KIẾM THẬT]
        const db = await getDb();
        const schedulesRef = collection(db, 'schedules');
        const snapshot = await getDocs(schedulesRef);
        
        const allSchedules = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as any[];

        const searchUpper = String(rawClass).toUpperCase();
        const targetDateStr = String(rawDate);

        const filtered = allSchedules.filter(item => {
            try {
                if (!item || typeof item !== 'object') return false;

                // 1. Kiểm tra ngày - Chuyển về chuỗi an toàn
                const itemDateObj = item.Date || item.date || "";
                const itemDate = String(itemDateObj).trim();
                if (itemDate !== targetDateStr) return false;

                // 2. Nếu không nhập mã lớp thì hiện tất cả của ngày đó
                const query = String(rawClass || "").trim().toUpperCase();
                if (!query) return true;

                // 3. Kiểm tra mã lớp, tên môn học hoặc link cuộc họp - So sánh chuỗi an toàn
                const itemClass = String(item.Class || item.class || "").toUpperCase();
                const itemCourse = String(item.Course || item.course || item.content || "").toUpperCase();
                const itemLink = String(item.meetingLink || item.MeetingLink || "").toLowerCase();
                const queryLower = query.toLowerCase();
                
                return itemClass.includes(query) || 
                       itemCourse.includes(query) || 
                       (itemLink && itemLink.includes(queryLower));
            } catch (e) {
                return false;
            }
        });

        return NextResponse.json({ 
            success: true, 
            data: filtered,
            message: filtered.length > 0 ? "Tìm thấy lớp học" : "Không tìm thấy lớp nào phù hợp",
            debug_info: {
                total_in_db: allSchedules.length,
                target_date: targetDateStr,
                search_query: rawClass
            }
        }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch (error: any) {
        console.error("API Route Error:", error);
        // Trả về stack trace để chẩn đoán chính xác vị trí lỗi
        return NextResponse.json({ 
            success: false, 
            message: error.message,
            stack: error.stack // QUAN TRỌNG: Dòng này giúp biết chính xác lỗi ở đâu
        }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
}
