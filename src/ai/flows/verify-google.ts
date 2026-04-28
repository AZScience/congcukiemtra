'use server';

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Hàm làm sạch mã khóa để tránh lỗi DECODER routines::unsupported
function cleanPrivateKey(key: string): string {
    if (!key) return "";
    let cleaned = key.trim();
    // 1. Loại bỏ dấu ngoặc kép nếu người dùng copy cả dấu ngoặc từ file JSON
    cleaned = cleaned.replace(/^"|"$/g, '');
    // 2. Thay thế các ký tự \n viết liền thành dấu xuống dòng thực tế
    cleaned = cleaned.replace(/\\n/g, '\n');
    // 3. Loại bỏ các khoảng trắng dư thừa ở đầu mỗi dòng (nếu có)
    return cleaned;
}

export async function verifyGoogleSheetConnection(
    sheetId: string,
    email: string,
    privateKey: string,
    tabName?: string
) {
    if (!sheetId || !email || !privateKey) {
        return { success: false, message: "Vui lòng nhập đầy đủ Sheet ID, Email và Private Key." };
    }

    try {
        const serviceAccountAuth = new JWT({
            email: email,
            key: cleanPrivateKey(privateKey),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();
        
        let tabMsg = "";
        if (tabName) {
            const sheet = doc.sheetsByTitle[tabName];
            if (sheet) {
                tabMsg = ` Đã tìm thấy Tab "${tabName}".`;
            } else {
                tabMsg = ` Lưu ý: Không tìm thấy Tab "${tabName}", hệ thống sẽ tự tạo mới khi có dữ liệu.`;
            }
        }

        return { 
            success: true, 
            message: `Kết nối thành công! Đã nhận diện được tệp: "${doc.title}".${tabMsg}` 
        };
    } catch (error: any) {
        console.error("Google Sheet Verification Error Detail:", error);
        
        // Trích xuất thông báo lỗi chi tiết nhất có thể
        let rawMsg = error.message || "";
        if (error.response?.data?.error_description) rawMsg = error.response.data.error_description;
        if (error.response?.data?.error?.message) rawMsg = error.response.data.error.message;
        
        let msg = rawMsg || "Không thể kết nối Google Sheet (Lỗi không xác định).";
        
        if (msg.toLowerCase().includes("invalid_grant")) {
            msg = "Lỗi xác thực (invalid_grant): Email hoặc Private Key của Service Account không chính xác.";
        } else if (msg.includes("404")) {
            msg = "Lỗi 404: Không tìm thấy file Sheet. Hãy kiểm tra lại Google Sheet ID.";
        } else if (msg.includes("403")) {
            msg = "Lỗi 403: Không có quyền truy cập. Hãy chia sẻ quyền Editor cho email Service Account.";
        } else if (msg.toLowerCase().includes("iam")) {
            msg = "Lỗi phân quyền IAM: Vui lòng kiểm tra lại cấu hình Service Account trên Google Cloud.";
        }

        return { success: false, message: msg };
    }
}

export async function verifyGoogleDriveConnection(
    folderId: string,
    email: string,
    privateKey: string
) {
    if (!folderId || !email || !privateKey) {
        return { success: false, message: "Vui lòng nhập Folder ID, Email và Private Key." };
    }

    try {
        const serviceAccountAuth = new JWT({
            email: email,
            key: cleanPrivateKey(privateKey),
            scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'],
        });

        const { token } = await serviceAccountAuth.getAccessToken();
        if (!token) throw new Error("Không lấy được token xác thực.");

        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=name,kind,mimeType`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error?.message || "Lỗi truy cập Drive.");
        }

        if (data.mimeType !== 'application/vnd.google-apps.folder') {
            return { success: false, message: "ID này không phải là một Thư mục (Folder)." };
        }

        return { 
            success: true, 
            message: `Kết nối Drive thành công! Thư mục: "${data.name}".` 
        };
    } catch (error: any) {
        console.error("Google Drive Verification Error Detail:", error);
        
        let rawMsg = error.message || "";
        // Fetch API errors (Drive) might be in JSON
        try {
            if (rawMsg.includes("{")) {
                const parsed = JSON.parse(rawMsg);
                if (parsed.error?.message) rawMsg = parsed.error.message;
            }
        } catch(e) {}

        let msg = rawMsg || "Không thể kết nối Google Drive (Lỗi không xác định).";
        
        if (msg.includes("404")) {
            msg = "Lỗi 404: Không tìm thấy thư mục Drive. Hãy kiểm tra lại Folder ID.";
        } else if (msg.includes("403")) {
            msg = "Lỗi 403: Không có quyền truy cập Drive. Hãy chia sẻ quyền Editor cho Service Account.";
        } else if (msg.toLowerCase().includes("invalid_grant")) {
            msg = "Lỗi xác thực: Email hoặc Private Key không hợp lệ.";
        }

        return { success: false, message: msg };
    }
}
