param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2",
    [string]$RemotePath = "thaipesleague.com" # หรือโฟลเดอร์หลักของเว็บไซต์คุณ
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

# รายชื่อโฟลเดอร์ที่ไม่ต้องการอัปโหลด (ยกเว้น logo นักเตะ/คลับ ที่ระบบต้องการ)
$excludeList = @("backend")
# 1. Build Frontend
Write-Host "1. Building Frontend..." -ForegroundColor Yellow
Set-Location "$repoRoot\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

# 2. Publish Backend
Write-Host "2. Publishing Backend..." -ForegroundColor Yellow
Set-Location "$repoRoot\backend"
# 2. Publish Backend (Target win-x86 for hosting compatibility)
Write-Host "2. Publishing Backend (win-x86)..." -ForegroundColor Yellow
Set-Location "$repoRoot\backend"
# Clear old publish data
if (Test-Path "$repoRoot\deploy\backend") { Remove-Item -Path "$repoRoot\deploy\backend" -Recurse -Force }
dotnet publish -c Release -r win-x86 --self-contained true -o "$repoRoot\deploy\backend"
Write-Host "3. Taking app offline..." -ForegroundColor Yellow
$appOfflineContent = @"
<!DOCTYPE html>
<html>
<head><title>Updating...</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
<html lang="th-TH">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="google" content="notranslate">
    <title>eTPL Maintenance</title>
    <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .card { background: rgba(255,255,255,0.03); padding: 3rem; border-radius: 32px; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); max-width: 450px; }
        h1 { margin: 0; font-size: 1.75rem; font-weight: 800; letter-spacing: -0.025em; color: #f8fafc; }
        p { opacity: 0.7; margin-top: 1rem; font-size: 1rem; line-height: 1.6; font-weight: 500; }
        .accent { color: #3b82f6; font-weight: 800; }
    </style>
</head>
<body>
    <div class="card">
        <h1><span class="accent">eTPL</span> กำลังอัปเดตระบบ</h1>
        <p>เรากำลังรวมระบบ Frontend และ Backend เข้าด้วยกันเพื่อประสิทธิภาพที่ดีขึ้น<br>กรุณารอสักครู่ (ประมาณ 3-5 นาที)</p>
    </div>
$tempAppOfflinePath = "$repoRoot\deploy\app_offline.htm"
Set-Content -Path $tempAppOfflinePath -Value $appOfflineContent -Force

# Upload app_offline.htm
$pwsh = if (Get-Command powershell -ErrorAction SilentlyContinue) { "powershell" } else { "pwsh" }
& $pwsh -ExecutionPolicy Bypass -File "$repoRoot\deploy\upload-ftp.ps1" `
    -Server $Server -Username $Username -Password $Password `
    -LocalPath "$repoRoot\deploy" -RemotePath $RemotePath -ExcludePaths @("backend")

Write-Host "App is offline. Waiting 5 seconds..."
Start-Sleep -Seconds 5

# 4. Upload App Files
Write-Host "4. Uploading application files (Frontend + Backend)..." -ForegroundColor Yellow
& $pwsh -ExecutionPolicy Bypass -File "$repoRoot\deploy\upload-ftp.ps1" `
    -Server $Server -Username $Username -Password $Password `
    -LocalPath "$repoRoot\deploy\backend" -RemotePath $RemotePath

# 5. Bring App Online
Write-Host "5. Bringing app back online..." -ForegroundColor Yellow
$delReq = [System.Net.FtpWebRequest]::Create("ftp://$Server/$RemotePath/app_offline.htm")
$delReq.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
$delReq.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
$delReq.UsePassive = $false
try {
    $delResp = $delReq.GetResponse()
    $delResp.Close()
    Write-Host "app_offline.htm removed. Website is live at $RemotePath!" -ForegroundColor Green
} catch {
    Write-Warning "Could not remove app_offline.htm automatically. Please delete it via FTP if site shows maintenance."
}

Remove-Item $tempAppOfflinePath -Force -ErrorAction SilentlyContinue
Set-Location $repoRoot
Write-Host "--- Deployment Complete! ---" -ForegroundColor Cyan
Set-Location $repoRoot
Write-Host "--- Deployment Complete! ---" -ForegroundColor Cyan
