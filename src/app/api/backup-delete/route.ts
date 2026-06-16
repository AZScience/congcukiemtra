import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { fileName } = await req.json();

        if (!fileName || typeof fileName !== 'string' || !fileName.endsWith('.json')) {
            return NextResponse.json({ success: false, error: 'Tên file không hợp lệ' }, { status: 400 });
        }

        // Prevent path traversal attacks
        const sanitizedFileName = path.basename(fileName);
        
        const backupDir = path.join(process.cwd(), 'public', 'backups');
        const filePath = path.join(backupDir, sanitizedFileName);
        
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ success: false, error: 'File không tồn tại' }, { status: 404 });
        }

        fs.unlinkSync(filePath);

        return NextResponse.json({ success: true, message: 'Đã xóa file thành công' });
    } catch (error: any) {
        console.error('Lỗi khi xóa file backup:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
