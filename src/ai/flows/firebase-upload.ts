'use server';

import { JWT } from 'google-auth-library';
import crypto from 'crypto';

export async function uploadToFirebaseServer(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const fileName = file?.name || `file_${Date.now()}`;
        const privateKey = formData.get('privateKey') as string;
        const clientEmail = formData.get('clientEmail') as string;
        const projectId = formData.get('projectId') as string;
        const storageBucket = formData.get('storageBucket') as string || 'kiemtranoibo-ccks.firebasestorage.app';

        if (!file || !privateKey || !clientEmail || !projectId) {
            throw new Error("Thiếu thông tin cấu hình Firebase/Google Cloud.");
        }

        // 1. Khởi tạo JWT Auth
        const auth = new JWT({
            email: clientEmail,
            key: privateKey.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/devstorage.full_control'],
        });

        const { token } = await auth.getAccessToken();
        if (!token) throw new Error("Không thể lấy Access Token từ Service Account.");

        // Ưu tiên bucket được truyền từ client (cấu hình trong system params)
        const bucketNames = [
            storageBucket,
            'kiemtranoibo-ccks.firebasestorage.app',
            'kiemtranoibo-ccks.appspot.com',
            'kiemtranoibo-493603.appspot.com',
        ].filter((v, i, a) => v && a.indexOf(v) === i);

        const buffer = Buffer.from(await file.arrayBuffer());
        let lastError = null;
        const safeFileName = `${Date.now()}_${fileName}`;
        const downloadToken = crypto.randomUUID();

        for (const bName of bucketNames) {
            try {
                console.log(`>>> Đang thử tải lên Bucket: ${bName} (với Firebase Token)...`);
                
                // Sử dụng Multipart Upload để đính kèm Metadata (Firebase Token)
                const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bName}/o?uploadType=multipart&name=${encodeURIComponent(safeFileName)}`;
                
                const metadata = {
                    contentType: file.type || 'application/octet-stream',
                    metadata: {
                        firebaseStorageDownloadTokens: downloadToken
                    }
                };

                const boundary = 'foo_bar_baz';
                const multipartBody = Buffer.concat([
                    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`),
                    buffer,
                    Buffer.from(`\r\n--${boundary}--`)
                ]);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout per bucket

                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`,
                    },
                    body: multipartBody,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`Thử bucket ${bName} thất bại:`, errorText);
                    lastError = errorText;
                    continue;
                }

                console.log(`Tải lên Bucket ${bName} THÀNH CÔNG!`);
                
                // Tạo Firebase Download URL chuẩn (Bypass 403)
                const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/${bName}/o/${encodeURIComponent(safeFileName)}?alt=media&token=${downloadToken}`;
                console.log(`Firebase URL: ${firebaseUrl}`);

                return {
                    success: true,
                    url: firebaseUrl,
                    fileName: safeFileName,
                    bucketUsed: bName
                };
            } catch (err: any) {
                lastError = err.message;
                continue;
            }
        }

        throw new Error(lastError || "Không thể tải lên bất kỳ bucket nào.");

    } catch (error: any) {
        console.error("Lỗi REST API Upload:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}
