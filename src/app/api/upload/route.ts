import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  if (process.env.VERCEL === '1') {
    return NextResponse.json({ success: false, error: 'Vercel không hỗ trợ lưu trữ file cục bộ' }, { status: 400 });
  }

  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy file' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Lưu vào thư mục public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Tạo tên file an toàn
    const extension = file.name.split('.').pop() || '';
    const randomString = Math.random().toString(36).substring(2, 8);
    const safeName = `${Date.now()}_${randomString}.${extension}`;
    
    const path = join(uploadDir, safeName);
    await writeFile(path, buffer);
    
    console.log(`Đã lưu file tại: ${path}`);

    // Trả về đường dẫn tuyệt đối bắt đầu bằng /uploads/
    return NextResponse.json({ 
        success: true, 
        url: `/uploads/${safeName}` 
    });
    
  } catch (e: any) {
    console.error("Lỗi khi lưu file local:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
