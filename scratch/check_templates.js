const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const templatesDir = path.join(process.cwd(), 'public', 'templates');
const files = ['daily_report_template.xlsx', 'daily_schedule_template.xlsx'];

files.forEach(fileName => {
    const filePath = path.join(templatesDir, fileName);
    console.log(`\n========================================`);
    console.log(`FILE: ${fileName}`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`ERROR: File not found at ${filePath}`);
        return;
    }

    try {
        const workbook = XLSX.readFile(filePath);
        console.log(`Sheet Names: ${workbook.SheetNames.join(', ')}`);
        
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log(`\n--- Sheet: ${sheetName} ---`);
            for (let i = 0; i < 10; i++) {
                if (jsonData[i]) {
                    console.log(`Row ${i + 1}:`, JSON.stringify(jsonData[i]));
                }
            }
        });
    } catch (err) {
        console.error(`Error reading ${fileName}:`, err.message);
    }
});
