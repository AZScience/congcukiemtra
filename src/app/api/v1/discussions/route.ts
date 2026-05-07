import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, arrayUnion } from 'firebase/firestore';
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

export async function GET() {
  try {
    const db = await getDb();
    const q = query(collection(db, 'discussion_sections'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const sections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return NextResponse.json({ success: true, data: sections });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = await getDb();
    const { sectionId, content, author, title, studentContent, authorEmail, authorName } = body;

    // Nếu có sectionId thì là thêm comment/post vào section đó
    if (sectionId) {
        const sectionRef = doc(db, 'discussion_sections', sectionId);
        const newComment = {
          id: Math.random().toString(36).substring(7),
          text: content,
          authorName: authorName || author || "Người dùng",
          authorEmail: authorEmail || '',
          createdAt: new Date().toISOString()
        };

        await updateDoc(sectionRef, {
          comments: arrayUnion(newComment)
        });

        return NextResponse.json({ success: true, data: newComment }, {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
    } else {
        // Tạo mới Discussion Section
        const docRef = await addDoc(collection(db, 'discussion_sections'), {
            title: title || "Thảo luận mới",
            studentContent: studentContent || content || "",
            authorEmail: authorEmail || "",
            authorName: authorName || author || "Giảng viên",
            createdAt: serverTimestamp(),
            comments: []
        });

        return NextResponse.json({ success: true, id: docRef.id }, {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { 
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
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
    });
}
