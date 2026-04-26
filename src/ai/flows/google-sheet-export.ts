
'use server';

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { format } from 'date-fns';

function cleanPrivateKey(key: string): string {
    if (!key) return "";
    let cleaned = key.trim();
    cleaned = cleaned.replace(/^"|"$/g, '');
    cleaned = cleaned.replace(/\\n/g, '\n');
    return cleaned;
}

export async function getGoogleSheetTabs(
    sheetId: string,
    serviceAccountEmail: string,
    privateKey: string
) {
    if (!sheetId || !serviceAccountEmail || !privateKey) {
        throw new Error("Cấu hình Google Sheets chưa hoàn thiện.");
    }

    try {
        console.log("Fetching tabs for sheet:", sheetId);
        const serviceAccountAuth = new JWT({
            email: serviceAccountEmail,
            key: cleanPrivateKey(privateKey),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();

        const tabTitles = doc.sheetsByIndex.map(sheet => sheet.title);
        console.log("Found tabs:", tabTitles);
        return tabTitles;
    } catch (error: any) {
        console.error("Error fetching Google Sheet tabs:", error);
        throw new Error(`Không thể lấy danh sách tab: ${error.message}`);
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
            key: cleanPrivateKey(privateKey),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();

        const finalTabName = tabName || "Dữ liệu Xuất";
        let sheet = doc.sheetsByTitle[finalTabName];
        
        if (!sheet) {
            throw new Error(`KHÔNG TÌM THẤY trang tính tên là "${finalTabName}". Vui lòng kiểm tra lại tên Tab trong cài đặt.`);
        }

        const fields = Object.keys(columnMapping);
        const rowCount = sheet.rowCount;
        const colCount = sheet.columnCount;
        
        // 1. Tải toàn bộ dữ liệu hiện có để đối soát nội dung
        await sheet.loadCells({
            startRowIndex: 0,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: colCount
        });

        let lastDataRowIndex = 0; 
        let maxSttValue = 0;
        
        // Tạo một tập hợp các chuỗi đại diện cho dữ liệu đã tồn tại để so sánh nhanh
        const existingRowsSet = new Set<string>();
        
        for (let r = 0; r < rowCount; r++) {
            const cellA = sheet.getCell(r, 0);
            if (cellA.value !== null && cellA.value !== undefined && cellA.value !== "") {
                lastDataRowIndex = r;
                const stt = parseInt(String(cellA.value || '0'));
                if (!isNaN(stt) && stt > maxSttValue) maxSttValue = stt;
                
                // Tạo mã nhận diện dòng dựa trên nội dung các cột dữ liệu (bỏ qua cột STT ở index 0)
                const rowContent = fields.map((_, fIdx) => String(sheet.getCell(r, fIdx + 1).value || '').trim()).join('|');
                if (rowContent) existingRowsSet.add(rowContent);
            }
        }

        // 2. Lọc dữ liệu: Chỉ lấy những dòng mà nội dung chưa tồn tại trên Sheet
        const newData = data.filter(item => {
            const itemContent = fields.map(field => String(item[field] || '').trim()).join('|');
            return !existingRowsSet.has(itemContent);
        });
        
        if (newData.length === 0) {
            return { success: true, message: "Tất cả dữ liệu này đã tồn tại trên Sheet (trùng khớp nội dung). Không có gì để cập nhật." };
        }

        let targetRowIndex = lastDataRowIndex + 1;
        const neededRows = targetRowIndex + newData.length;
        
        if (neededRows > rowCount) {
            await sheet.resize({ rowCount: neededRows, columnCount: colCount });
        }
        
        // Tải vùng ghi mới
        await sheet.loadCells({
            startRowIndex: targetRowIndex,
            endRowIndex: neededRows,
            startColumnIndex: 0,
            endColumnIndex: colCount
        });

        // 3. Ghi dữ liệu mới
        newData.forEach((item, idx) => {
            const currentRow = targetRowIndex + idx;
            sheet.getCell(currentRow, 0).value = maxSttValue + idx + 1;
            fields.forEach((field, fIdx) => {
                sheet.getCell(currentRow, fIdx + 1).value = item[field] || '';
            });
        });

        await sheet.saveUpdatedCells();

        // 4. Sao chép định dạng từ dòng trước đó cho các dòng mới (Toàn bộ chiều rộng bảng)
        if (lastDataRowIndex > 0 && data.length > 0) {
            try {
                // Sử dụng dòng 1 (dòng dữ liệu đầu tiên) làm mẫu nếu có thể, hoặc dòng cuối cùng
                const sourceRowIndex = lastDataRowIndex >= 1 ? 1 : 0;
                await sheet.copyPaste(
                    { startRowIndex: sourceRowIndex, endRowIndex: sourceRowIndex + 1, startColumnIndex: 0, endColumnIndex: sheet.columnCount },
                    { startRowIndex: targetRowIndex, endRowIndex: neededRows, startColumnIndex: 0, endColumnIndex: sheet.columnCount },
                    'PASTE_FORMAT'
                );
            } catch (fmtError) {
                console.warn("Could not copy formatting:", fmtError);
            }
        }

        // 5. Thu gọn bảng: Xóa bỏ các dòng trống thừa ở cuối (nếu có)
        await sheet.resize({ rowCount: neededRows, columnCount: colCount });

        return { 
            success: true, 
            message: `[THÀNH CÔNG] Đã ghi ${data.length} dòng vào đúng trang "${sheet.title}" (Bắt đầu từ Dòng ${targetRowIndex + 1})` 
        };
    } catch (error: any) {
        console.error("Dynamic Sheet Export Error:", error);
        return { success: false, message: error.message };
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
            key: cleanPrivateKey(privateKey),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();

        const finalTabName = tabName || "Báo cáo Tổng hợp";
        let sheet = doc.sheetsByTitle[finalTabName];
        
        if (!sheet) {
            throw new Error(`LỖI: Không tìm thấy trang tính tên là "${finalTabName}" trong file Google Sheet của bạn. Vui lòng kiểm tra lại tên Tab.`);
        }

        // 1. Tải dữ liệu để đối soát
        const rowCount = sheet.rowCount;
        const colCount = sheet.columnCount;
        await sheet.loadCells({
            startRowIndex: 0,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: colCount
        });

        let lastDataRowIndex = 0; 
        let maxSttValue = 0;
        const existingRowsSet = new Set<string>();

        // Quét dữ liệu hiện có
        for (let r = 0; r < rowCount; r++) {
            const cellA = sheet.getCell(r, 0);
            if (cellA.value !== null && cellA.value !== undefined && cellA.value !== "") {
                lastDataRowIndex = r;
                const sttVal = parseInt(String(cellA.value || '0'));
                if (!isNaN(sttVal) && sttVal > maxSttValue) maxSttValue = sttVal;
                
                // Tạo key so khớp từ các cột chính (Nhân viên, Ngày, Phòng, Tiết, Lớp, Giảng viên, Loại báo cáo)
                const rowKey = [1, 2, 3, 4, 6, 7, 12].map(c => String(sheet.getCell(r, c).value || '').trim()).join('|');
                if (rowKey) existingRowsSet.add(rowKey);
            }
        }

        // 2. Lọc trùng nội dung
        const newData = data.filter(item => {
            const itemKey = [
                item.employee, item.date, item.room, item.period, item.class, item.lecturer, item.typeLabel
            ].map(v => String(v || '').trim()).join('|');
            return !existingRowsSet.has(itemKey);
        });

        if (newData.length === 0) {
            return { success: true, message: "Báo cáo này đã tồn tại trên Sheet (trùng khớp nội dung). Không có gì để đẩy thêm." };
        }

        let targetRowIndex = lastDataRowIndex + 1;
        const neededRows = targetRowIndex + newData.length;
        
        if (neededRows > rowCount) {
            await sheet.resize({ rowCount: neededRows, columnCount: colCount });
        }
        
        await sheet.loadCells({
            startRowIndex: targetRowIndex,
            endRowIndex: neededRows,
            startColumnIndex: 0,
            endColumnIndex: colCount
        });

        newData.forEach((item, idx) => {
            const currentRow = targetRowIndex + idx;
            sheet.getCell(currentRow, 0).value = maxSttValue + idx + 1; 
            sheet.getCell(currentRow, 1).value = item.employee || '';
            sheet.getCell(currentRow, 2).value = item.date || '';
            sheet.getCell(currentRow, 3).value = item.room || '';
            sheet.getCell(currentRow, 4).value = item.period || '';
            sheet.getCell(currentRow, 5).value = item.department || '';
            sheet.getCell(currentRow, 6).value = item.class || '';
            sheet.getCell(currentRow, 7).value = item.lecturer || '';
            sheet.getCell(currentRow, 8).value = item.studentCount || '---';
            sheet.getCell(currentRow, 9).value = item.incident || '';
            sheet.getCell(currentRow, 10).value = item.isNotification ? "Có" : "";
            sheet.getCell(currentRow, 11).value = item.incidentDetail || '';
            sheet.getCell(currentRow, 12).value = item.typeLabel || '';
        });

        await sheet.saveUpdatedCells();
        
        // 3. Sao chép định dạng từ dòng trước cho các dòng mới
        if (lastDataRowIndex > 0 && data.length > 0) {
            try {
                const sourceRowIndex = lastDataRowIndex >= 1 ? 1 : 0;
                await sheet.copyPaste(
                    { startRowIndex: sourceRowIndex, endRowIndex: sourceRowIndex + 1, startColumnIndex: 0, endColumnIndex: sheet.columnCount },
                    { startRowIndex: targetRowIndex, endRowIndex: neededRows, startColumnIndex: 0, endColumnIndex: sheet.columnCount },
                    'PASTE_FORMAT'
                );
            } catch (fmtError) {
                console.warn("Could not copy formatting in Daily Report:", fmtError);
            }
        }

        // 4. Thu gọn bảng: Xóa dòng trống cuối
        await sheet.resize({ rowCount: neededRows, columnCount: sheet.columnCount });
        return { 
            success: true, 
            message: `[THÀNH CÔNG] Đã đẩy ${data.length} dòng vào đúng trang "${sheet.title}" (Bắt đầu từ Dòng ${targetRowIndex + 1}).` 
        };
    } catch (error: any) {
        console.error("Push Daily Error:", error);
        return { success: false, message: error.message };
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
            key: cleanPrivateKey(privateKey),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();

        const finalTabName = tabName || "Trang tính1";
        let sheet = doc.sheetsByTitle[finalTabName];
        
        if (!sheet) {
            throw new Error(`LỖI: Không tìm thấy trang tính tên là "${finalTabName}" trong file Google Sheet. Vui lòng kiểm tra lại tên Tab.`);
        }

        const rowCount = sheet.rowCount;
        const scanStart = Math.max(0, rowCount - 2000);
        
        // Load cells for searching
        await sheet.loadCells({
            startRowIndex: scanStart,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: 10
        });

        // 1. Xác định dòng cuối cùng thực sự có dữ liệu và STT lớn nhất
        let lastDataRowIndex = 0; 
        let maxStt = 0;

        // Quét ngược tìm dòng cuối
        for (let r = rowCount - 1; r >= scanStart; r--) {
            const hasData = [0, 1, 2, 3, 4, 5, 6].some(c => !!sheet.getCell(r, c).value);
            if (hasData) {
                lastDataRowIndex = r;
                break;
            }
        }

        for (let r = scanStart; r < rowCount; r++) {
            const sttVal = parseInt(String(sheet.getCell(r, 0).value || '0'));
            if (!isNaN(sttVal) && sttVal > maxStt) maxStt = sttVal;
        }

        let targetRowIndex = lastDataRowIndex + 1;

        // Đảm bảo Sheet đủ dòng để ghi
        const neededRows = targetRowIndex + data.length;
        if (neededRows > rowCount) {
            await sheet.resize({ rowCount: neededRows + 50, columnCount: sheet.columnCount });
        }

        // TẢI VÙNG GHI
        await sheet.loadCells({
            startRowIndex: targetRowIndex,
            endRowIndex: neededRows,
            startColumnIndex: 0,
            endColumnIndex: 10
        });

        // 2. Ghi dữ liệu
        for (let i = 0; i < data.length; i++) {
            const currentRow = targetRowIndex + i;
            const item = data[i];
            
            // Cột A: STT
            sheet.getCell(currentRow, 0).value = maxStt + i + 1;
            sheet.getCell(currentRow, 0).horizontalAlignment = 'CENTER';

            // Các cột tiếp theo (B -> G)
            const colTimestamp = 1; // B
            const colName = 2;      // C
            const colPrinted = 3;   // D
            const colOnline = 4;    // E
            const colIncident = 5;  // F
            const colFacility = 6;  // G

            sheet.getCell(currentRow, colTimestamp).value = item.timestamp;
            sheet.getCell(currentRow, colName).value = item.employeeName;
            
            sheet.getCell(currentRow, colPrinted).value = item.proofPrinted || " ";
            sheet.getCell(currentRow, colOnline).value = item.proofOnline || " ";
            sheet.getCell(currentRow, colIncident).value = item.proofIncident || " ";
            sheet.getCell(currentRow, colFacility).value = item.proofFacility || " ";

            [colPrinted, colOnline, colIncident, colFacility].forEach(col => {
                sheet.getCell(currentRow, col).wrapStrategy = 'WRAP';
            });
        }

        await sheet.saveUpdatedCells();
        return { 
            success: true, 
            message: `[THÀNH CÔNG] Đã ghi dữ liệu vào đúng trang "${sheet.title}" (Dòng ${targetRowIndex + 1}).` 
        };
    } catch (error: any) {
        console.error("Push Feedback Error:", error);
        throw new Error(error.message || "Lỗi khi kết nối Google Sheet.");
    }
}
