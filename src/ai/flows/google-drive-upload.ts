'use server';

import { JWT } from 'google-auth-library';

export async function uploadToGoogleDrive(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const folderId = formData.get('folderId') as string;
        const serviceAccountEmail = formData.get('serviceAccountEmail') as string;
        const privateKey = formData.get('privateKey') as string;

        if (!file || !folderId || !serviceAccountEmail || !privateKey) {
            throw new Error("Thiếu thông tin file hoặc cấu hình tài khoản Service Account.");
        }

        // 1. Authenticate with Google Drive
        const serviceAccountAuth = new JWT({
            email: serviceAccountEmail,
            key: privateKey.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const { token } = await serviceAccountAuth.getAccessToken();

        if (!token) {
            throw new Error("Không thể lấy token xác thực từ Google.");
        }

        // 2. Prepare file data and metadata for multipart upload
        const metadata = {
            name: file.name,
            parents: [folderId],
        };

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        // Read file as ArrayBuffer then Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const multipartRequestBody = Buffer.concat([
            Buffer.from(
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
            ),
            buffer,
            Buffer.from(close_delim)
        ]);

        // 3. Upload to Google Drive
        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
                'Content-Length': multipartRequestBody.length.toString(),
            },
            body: multipartRequestBody as unknown as BodyInit,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
            console.error("Lỗi khi tải file lên:", uploadData);
            throw new Error(uploadData.error?.message || "Lỗi tải file lên Drive.");
        }

        const fileId = uploadData.id;

        // 4. Set permission to "Anyone with the link can view"
        const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                role: 'reader',
                type: 'anyone'
            })
        });

        if (!permRes.ok) {
            console.error("Lỗi khi cấp quyền chia sẻ:", await permRes.text());
            // We won't throw here, just return the link anyway.
        }

        return {
            success: true,
            fileId: fileId,
            url: uploadData.webViewLink
        };

    } catch (error: any) {
        console.error("Lỗi Google Drive Upload:", error);
        return {
            success: false,
            error: error.message || "Đã xảy ra lỗi không xác định."
        };
    }
}
