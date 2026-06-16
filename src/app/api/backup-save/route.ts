import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { data, filename } = body;

        if (!data || !filename) {
            return NextResponse.json({ success: false, error: 'Thiếu dữ liệu hoặc tên file' }, { status: 400 });
        }

        // Đảm bảo thư mục public/backups tồn tại
        const backupDir = path.join(process.cwd(), 'public', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const filePath = path.join(backupDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

        return NextResponse.json({ 
            success: true, 
            url: `/backups/${filename}`,
            filePath: filePath
        });
    } catch (error: any) {
        console.error('Backup save error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
