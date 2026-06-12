import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const backupDir = path.join(process.cwd(), 'public', 'backups');
        
        if (!fs.existsSync(backupDir)) {
            return NextResponse.json({ success: true, files: [] });
        }

        const files = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(backupDir, file);
                const stat = fs.statSync(filePath);
                return {
                    name: file,
                    size: stat.size,
                    createdAt: stat.mtime
                };
            })
            // Sort by createdAt descending (newest first)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return NextResponse.json({ success: true, files });
    } catch (error: any) {
        console.error('Lỗi khi đọc danh sách backup:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
