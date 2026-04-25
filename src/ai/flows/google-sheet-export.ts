
'use server';

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { format } from 'date-fns';


export async function getGoogleSheetTabs(
    sheetId: string,
    serviceAccountEmail: string,
    privateKey: string
) {
    if (!sheetId || !serviceAccountEmail || !privateKey) {
        throw new Error("Cấu hình Google Sheets chưa hoàn thiện.");
    }

    try {
        const serviceAccountAuth = new JWT({
            email: serviceAccountEmail,
            key: privateKey.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();

        return doc.sheetsByIndex.map(sheet => sheet.title);
    } catch (error: any) {
        console.error("Error fetching Google Sheet tabs:", error);
        throw new Error(error.message || "Không thể lấy danh sách tab.");
    }
}

export async function pushToGoogleSheetDynamic(
    data: any[],
    headers: string[],
    columnMapping: Record<string, string>,
    sheetId: string,
    serviceAccountEmail: string,
    privateKey: string,
    tabName: string
) {
    if (!sheetId || !serviceAccountEmail || !privateKey) {
        throw new Error("Cấu hình Google Sheets chưa hoàn thiện trong Tham số hệ thống.");
    }

    try {
        const serviceAccountAuth = new JWT({
            email: serviceAccountEmail,
            key: privateKey.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();

        const finalTabName = tabName || "Dữ liệu Xuất";
        let sheet = doc.sheetsByTitle[finalTabName];

        // Ensure sheet exists without touching headers
        if (!sheet) {
            sheet = await doc.addSheet({ title: finalTabName });
        }

        // Load all cells in the relevant columns to avoid "not loaded" errors
        // Google Sheets API has a limit of 10k-100k cells per call. 
        // 1000 rows * 12 columns = 12,000 cells (Safe)
        const rowCount = sheet.rowCount;
        await sheet.loadCells({
            startRowIndex: 0,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: 12 // Columns A to L
        });

        // 1. Manually find the last STT in Column A (Index 0)
        let maxSttValue = 0;
        for (let r = rowCount - 1; r >= 0; r--) {
            try {
                const cell = sheet.getCell(r, 0);
                const val = parseInt(String(cell.value || ''));
                if (!isNaN(val)) {
                    maxSttValue = val;
                    break;
                }
            } catch (e) { continue; }
        }

        // 2. Build duplicate signatures based on POSITIONS (B to K)
        const duplicateSignatures = new Set<string>();
        const normalize = (v: any) => String(v || '').trim().toLowerCase();

        // Scan from Row 7 (Index 6) to the end
        for (let r = 6; r < rowCount; r++) {
            try {
                const sig = [];
                for (let c = 1; c <= 10; c++) { // Column B to K
                    sig.push(normalize(sheet.getCell(r, c).value));
                }
                const sigStr = sig.join('|');
                if (sigStr.replace(/\|/g, '').length > 0) {
                    duplicateSignatures.add(sigStr);
                }
            } catch (e) { continue; }
        }

        // Filter new data using the same POSITIONAL mapping
        const newData = data.filter(item => {
            const sig = [
                item.employee, item.date, item.room, item.period,
                item.department, item.class, item.lecturer, item.studentCount,
                item.incident, item.incidentDetail
            ].map(normalize).join('|');
            return !duplicateSignatures.has(sig);
        });

        if (newData.length === 0) {
            return { success: true, message: "Dữ liệu đã tồn tại hoàn toàn trên Google Sheet.", count: 0 };
        }

        // Prepare rows as raw arrays
        const rowsToPush = newData.map((item, idx) => {
            return [
                maxSttValue + idx + 1, // A: STT
                item.employee || '',    // B: Nhân viên
                item.date || '',        // C: Ngày
                item.room || '',        // D: Phòng
                item.period || '',      // E: Tiết
                item.department || '',  // F: Khoa
                item.class || '',       // G: Lớp
                item.lecturer || '',    // H: Giảng viên
                item.studentCount || '',// I: SV dự
                item.incident || '',    // J: Việc phát sinh
                item.incidentDetail || ''// K: Chi tiết sự việc
            ];
        });

        // 3. Find the first completely empty row (after Row 6)
        let targetRowIndex = 6;
        while (targetRowIndex < rowCount) {
            const cellA = sheet.getCell(targetRowIndex, 0);
            const cellB = sheet.getCell(targetRowIndex, 1);
            if (!cellA.value && !cellB.value) {
                break;
            }
            targetRowIndex++;
        }

        // Load the exact range we need to write to
        await sheet.loadCells({
            startRowIndex: targetRowIndex,
            endRowIndex: targetRowIndex + rowsToPush.length,
            startColumnIndex: 0,
            endColumnIndex: 11
        });

        // Fill the cells
        rowsToPush.forEach((rowData, rIdx) => {
            rowData.forEach((value, cIdx) => {
                const cell = sheet.getCell(targetRowIndex + rIdx, cIdx);
                cell.value = value;
            });
        });

        // Save everything in one go
        await sheet.saveUpdatedCells();

        return { success: true, message: `Đã nối thành công ${newData.length} dòng (Ghi trực tiếp từ dòng ${targetRowIndex + 1}).`, count: newData.length };
    } catch (error: any) {
        console.error("Error pushing to Google Sheet:", error);
        throw new Error(error.message || "Lỗi khi kết nối Google Sheet.");
    }
}

export async function pushDailyReportToGoogleSheet(
    data: any[],
    sheetId: string,
    serviceAccountEmail: string,
    privateKey: string,
    date: string,
    tabName: string
) {
    if (!sheetId || !serviceAccountEmail || !privateKey) {
        throw new Error("Cấu hình Google Sheets chưa hoàn thiện.");
    }

    try {
        const serviceAccountAuth = new JWT({
            email: serviceAccountEmail,
            key: privateKey.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();

        const finalTabName = tabName || "Báo cáo Tổng hợp";
        let sheet = doc.sheetsByTitle[finalTabName];

        if (!sheet) {
            sheet = await doc.addSheet({ title: finalTabName });
        }

        // Load existing cells for duplicate check
        const rowCount = sheet.rowCount;
        await sheet.loadCells({
            startRowIndex: 0,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: 12
        });

        // Duplicate check logic (same as dynamic but with allData fields)
        const duplicateSignatures = new Set<string>();
        const normalize = (v: any) => String(v || '').trim().toLowerCase();

        for (let r = 6; r < rowCount; r++) {
            try {
                const sig = [];
                for (let c = 1; c <= 10; c++) { // B to K
                    sig.push(normalize(sheet.getCell(r, c).value));
                }
                duplicateSignatures.add(sig.join('|'));
            } catch (e) { continue; }
        }

        const newData = data.filter(item => {
            const sig = [
                item.employee, item.date, item.room, item.period,
                item.department, item.class, item.lecturer, item.studentCount || '---',
                item.incident, item.incidentDetail
            ].map(normalize).join('|');
            return !duplicateSignatures.has(sig);
        });

        if (newData.length === 0) {
            return { success: true, message: "Dữ liệu ngày này đã tồn tại trên Sheet.", count: 0 };
        }

        // Find last STT
        let maxSttValue = 0;
        for (let r = rowCount - 1; r >= 0; r--) {
            const val = parseInt(String(sheet.getCell(r, 0).value || ''));
            if (!isNaN(val)) {
                maxSttValue = val;
                break;
            }
        }

        const rowsToPush = newData.map((item, idx) => [
            maxSttValue + idx + 1,
            item.employee || '',
            item.date || '',
            item.room || '',
            item.period || '',
            item.department || '',
            item.class || '',
            item.lecturer || '',
            item.studentCount || '---',
            item.incident || '',
            item.incidentDetail || ''
        ]);

        let targetRowIndex = 6;
        while (targetRowIndex < rowCount) {
            if (!sheet.getCell(targetRowIndex, 0).value && !sheet.getCell(targetRowIndex, 1).value) break;
            targetRowIndex++;
        }

        await sheet.loadCells({
            startRowIndex: targetRowIndex,
            endRowIndex: targetRowIndex + rowsToPush.length,
            startColumnIndex: 0,
            endColumnIndex: 11
        });

        rowsToPush.forEach((rowData, rIdx) => {
            rowData.forEach((value, cIdx) => {
                sheet.getCell(targetRowIndex + rIdx, cIdx).value = value;
            });
        });

        await sheet.saveUpdatedCells();
        return { success: true, message: `Đã đẩy ${newData.length} bản ghi mới lên Google Sheet.` };
    } catch (error: any) {
        console.error("Push Daily Error:", error);
        throw error;
    }
}

export async function pushFeedbackToGoogleSheet(
    data: { timestamp: string, email: string, employeeName: string, date: string, proofPrinted: string, proofOnline: string, proofIncident: string, proofFacility: string }[],
    sheetId: string,
    serviceAccountEmail: string,
    privateKey: string,
    tabName: string
) {
    if (!sheetId || !serviceAccountEmail || !privateKey) {
        throw new Error("Cấu hình Google Sheets chưa hoàn thiện.");
    }

    try {
        const serviceAccountAuth = new JWT({
            email: serviceAccountEmail,
            key: privateKey.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();

        const finalTabName = tabName || "Form Responses 1";
        let sheet = doc.sheetsByTitle[finalTabName];

        if (!sheet) {
            // Khởi tạo tab mới nếu chưa có, với các cột Header
            sheet = await doc.addSheet({ title: finalTabName });
            await sheet.setHeaderRow([
                "Dấu thời gian", 
                "Địa chỉ email", 
                "Cán bộ thực hiện kiểm tra, báo cáo", 
                "Ngày thực hiện, báo cáo kiểm tra", 
                "Minh chứng Tờ in sử dụng để Kiểm tra. (Lưu ý tờ in phải có chữ ký)",
                "Minh chứng kiểm tra ghi nhận các lớp trực tuyến",
                "Minh chứng các ghi nhận không phù hợp trong ca trực.",
                "Minh chứng ghi nhận cơ sở vật chất"
            ]);
        }

        const rowsToPush = data.map(item => [
            item.timestamp,
            item.email,
            item.employeeName,
            item.date,
            item.proofPrinted,
            item.proofOnline,
            item.proofIncident,
            item.proofFacility
        ]);

        await sheet.addRows(rowsToPush);

        return { success: true, message: "Đã gửi dữ liệu thành công lên Google Sheet." };
    } catch (error: any) {
        console.error("Push Feedback Error:", error);
        throw new Error(error.message || "Lỗi khi kết nối Google Sheet.");
    }
}
