$ErrorActionPreference = "Stop"

Write-Host "Đang build ứng dụng Next.js (có thể mất vài phút)..."
npm run build

$ReleaseDir = "release-portable"
if (Test-Path $ReleaseDir) {
    Remove-Item -Recurse -Force $ReleaseDir
}
New-Item -ItemType Directory -Path $ReleaseDir | Out-Null

Write-Host "Đang copy các file standalone..."
Copy-Item -Recurse -Path ".next/standalone/*" -Destination $ReleaseDir

Write-Host "Đang copy thư mục public và static..."
$PublicDest = Join-Path $ReleaseDir "public"
New-Item -ItemType Directory -Path $PublicDest | Out-Null
if (Test-Path "public") {
    Copy-Item -Recurse -Path "public/*" -Destination $PublicDest
}

$StaticDest = Join-Path $ReleaseDir ".next\static"
New-Item -ItemType Directory -Path (Join-Path $ReleaseDir ".next") -Force | Out-Null
New-Item -ItemType Directory -Path $StaticDest -Force | Out-Null
if (Test-Path ".next/static") {
    Copy-Item -Recurse -Path ".next/static/*" -Destination $StaticDest
}

# Copy các file biến môi trường nếu có
Write-Host "Đang copy các file biến môi trường (.env)..."
Get-ChildItem -Path . -Filter ".env*" -File | ForEach-Object {
    Copy-Item $_.FullName -Destination $ReleaseDir
}

Write-Host "Đang tải Node.js portable để chạy độc lập không cần cài đặt..."
$NodeUrl = "https://nodejs.org/dist/v20.11.1/win-x64/node.exe"
Invoke-WebRequest -Uri $NodeUrl -OutFile "$ReleaseDir\node.exe"

Write-Host "Đang tạo file khởi động (start.bat)..."
$BatContent = @"
@echo off
title He Thong Kiem Tra Noi Bo
echo Dang khoi dong ung dung...
echo Ung dung se chay tai http://localhost:3000
echo Nhan Ctrl+C de tat ung dung.
start http://localhost:3000
node.exe server.js
pause
"@
Set-Content -Path "$ReleaseDir\start.bat" -Value $BatContent

Write-Host "Đang nén ứng dụng thành file zip..."
if (Test-Path "app-portable.zip") {
    Remove-Item -Force "app-portable.zip"
}
Compress-Archive -Path "$ReleaseDir\*" -DestinationPath "app-portable.zip" -Force

Write-Host "======================================================"
Write-Host "HOÀN TẤT!"
Write-Host "Đã đóng gói xong vào file: app-portable.zip"
Write-Host "Bạn chỉ cần copy file app-portable.zip này sang máy khác,"
Write-Host "giải nén ra và chạy file start.bat để sử dụng!"
Write-Host "======================================================"
