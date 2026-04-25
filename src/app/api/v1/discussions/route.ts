import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, arrayUnion } from 'firebase/firestore';

export async function GET() {
  try {
    const q = query(collection(db, 'discussion_sections'), orderBy('createdAt', 'asc'));
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
    const { sectionId, content, author } = body;

    if (!sectionId || !content) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const sectionRef = doc(db, 'discussion_sections', sectionId);
    const newPost = {
      id: Math.random().toString(36).substr(2, 9),
      author: author || "Sinh viên",
      content: content,
      createdAt: new Date().toISOString(),
      comments: []
    };

    await updateDoc(sectionRef, {
      posts: arrayUnion(newPost)
    });

    return NextResponse.json({ success: true, data: newPost });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
