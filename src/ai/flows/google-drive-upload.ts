'use server';

import { JWT } from 'google-auth-library';

function cleanPrivateKey(key: string): string {
    if (!key) return "";
    let cleaned = key.trim();
    cleaned = cleaned.replace(/^"|"$/g, '');
    cleaned = cleaned.replace(/\\n/g, '\n');
    return cleaned;
}

function extractFolderId(input: string): string {
    if (!input) return "";
    const match = input.match(/[-\w]{25,}/);
    return match ? match[0] : input.trim();
}

export async function uploadToGoogleDrive(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const folderIdInput = (formData.get('folderId') as string || "").trim();
        const folderId = extractFolderId(folderIdInput);
        const serviceAccountEmail = (formData.get('serviceAccountEmail') as string || "").trim();
        const privateKey = formData.get('privateKey') as string;

        if (!file || !folderId || !serviceAccountEmail || !privateKey) {
            console.error("Thiếu thông tin cấu hình Drive:", { folderId, serviceAccountEmail, hasPrivateKey: !!privateKey });
            throw new Error("Cấu hình Google Drive không đầy đủ (Thiếu Folder ID, Email hoặc Private Key).");
        }

        console.log(`Đang sử dụng Service Account: ${serviceAccountEmail}`);

        // 1. Authenticate with Google Drive
        const serviceAccountAuth = new JWT({
            email: serviceAccountEmail,
            key: cleanPrivateKey(privateKey),
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        const { token } = await serviceAccountAuth.getAccessToken();

        if (!token) {
            throw new Error("Không thể lấy token xác thực từ Google.");
        }

        // 2. Prepare file data and metadata for multipart upload
        const performUpload = async (targetFolderId?: string) => {
            const metadata: any = { name: file.name };
            if (targetFolderId) metadata.parents = [targetFolderId];

            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

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

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds for Drive upload

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink&supportsAllDrives=true', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                    'Content-Length': multipartRequestBody.length.toString(),
                },
                body: multipartRequestBody as unknown as BodyInit,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            return response;
        };

        // Try with folder ID
        console.log(`Đang thử tải lên thư mục: ${folderId}`);
        const uploadRes = await performUpload(folderId);
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
            const detail = JSON.stringify(uploadData.error || uploadData);
            console.error("Lỗi Google Drive API:", detail);
            
            // --- DIAGNOSTIC STEP: Check Folder Capabilities ---
            let diagnosticInfo = "";
            try {
                const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=name,capabilities,owners&supportsAllDrives=true`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const checkData = await checkRes.json();
                
                if (checkRes.ok) {
                    const canAdd = checkData.capabilities?.canAddChildren;
                    const canEdit = checkData.capabilities?.canEdit;
                    diagnosticInfo = `\n[Chẩn đoán: Thư mục "${checkData.name}", Quyền thêm tệp: ${canAdd ? "CÓ" : "KHÔNG"}, Quyền sửa: ${canEdit ? "CÓ" : "KHÔNG"}]`;
                    if (!canAdd) {
                        diagnosticInfo += `\nLưu ý: Bạn cần đổi quyền sang "NGƯỜI CHỈNH SỬA".`;
                    }
                } else {
                    diagnosticInfo = `\n[Chẩn đoán: Google không tìm thấy thư mục này hoặc tài khoản hoàn toàn không có quyền xem]`;
                }
            } catch (diagError: any) {
                diagnosticInfo = `\n[Lỗi khi chạy chẩn đoán: ${diagError?.message || 'Không rõ lỗi'}]`;
            }

            // Thông báo lỗi cực kỳ chi tiết cho người dùng
            let friendlyError = `Không thể tải lên thư mục Drive (${folderId}). `;
            if (uploadRes.status === 404) friendlyError += "Lý do: Không tìm thấy thư mục (Sai ID).";
            else if (uploadRes.status === 403) friendlyError += `Lý do: Tài khoản "${serviceAccountEmail}" bị từ chối quyền truy cập.${diagnosticInfo}`;
            else friendlyError += `Lỗi hệ thống: ${uploadData.error?.message || "Không xác định"}`;
            
            throw new Error(friendlyError);
        }

        const fileId = uploadData.id;
        const finalUrl = uploadData.webViewLink || uploadData.webContentLink || `https://drive.google.com/file/d/${fileId}/view`;

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
            url: finalUrl
        };

    } catch (error: any) {
        console.error("Lỗi Google Drive Upload:", error);
        return {
            success: false,
            error: error.message || "Đã xảy ra lỗi không xác định."
        };
    }
}
