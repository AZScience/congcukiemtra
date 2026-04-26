'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

export async function uploadToFirebaseServer(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const privateKey = formData.get('privateKey') as string;
        const clientEmail = formData.get('clientEmail') as string;
        const projectId = formData.get('projectId') as string;
        const storageBucket = formData.get('storageBucket') as string;

        if (!file || !privateKey || !clientEmail || !projectId) {
            throw new Error("Thiếu thông tin cấu hình Firebase Admin.");
        }

        // Làm sạch Private Key
        const cleanKey = privateKey.replace(/\\n/g, '\n');

        // Khởi tạo Admin SDK (chỉ khởi tạo 1 lần)
        const apps = getApps();
        let app;
        if (apps.length === 0) {
            app = initializeApp({
                credential: cert({
                    projectId: projectId,
                    clientEmail: clientEmail,
                    privateKey: cleanKey,
                }),
                storageBucket: storageBucket || `${projectId}.appspot.com`
            });
        } else {
            app = apps[0];
        }

        const bucketNames = [
            storageBucket,
            `${projectId}.firebasestorage.app`,
            `${projectId}.appspot.com`
        ].filter(Boolean);

        let lastError = null;
        for (const bName of bucketNames) {
            try {
                const bucket = getStorage(app).bucket(bName as string);
                const buffer = Buffer.from(await file.arrayBuffer());
                
                const fileName = `evidence/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const blob = bucket.file(fileName);

                await blob.save(buffer, {
                    metadata: { contentType: file.type },
                });

                const [url] = await blob.getSignedUrl({
                    action: 'read',
                    expires: '03-01-2036', 
                });

                return { success: true, url };
            } catch (err: any) {
                lastError = err;
                console.warn(`Thử bucket ${bName} thất bại, đang thử cái tiếp theo...`);
                continue;
            }
        }

        throw lastError || new Error("Không thể tìm thấy bucket Storage hợp lệ.");

    } catch (error: any) {
        console.error("Firebase Admin Upload Error:", error);
        return { success: false, error: error.message };
    }
}
