param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2",
    [string]$RemotePath = "httpdocs" # เปลี่ยนจาก thaipesleague.com เป็น httpdocs
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

# รายชื่อโฟลเดอร์ที่ไม่ต้องการอัปโหลด (เช่น ถ้ามีอยู่แล้วบน Server ให้ใช้ตัวเดิม)
$excludeList = @("wwwroot/_image/CLUB_LOGO", "wwwroot/club_logo", "_image/CLUB_LOGO", "club_logo", "backend")

Write-Host "--- Starting Single Host Deployment (Frontend + Backend) ---" -ForegroundColor Cyan

# 1. Build Frontend
Write-Host "1. Building Frontend..." -ForegroundColor Yellow
Set-Location "$repoRoot\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

# 2. Publish Backend
Write-Host "2. Publishing Backend..." -ForegroundColor Yellow
Set-Location "$repoRoot\backend"
# Clear old publish data
if (Test-Path "$repoRoot\deploy\backend") { Remove-Item -Path "$repoRoot\deploy\backend" -Recurse -Force }
dotnet publish -c Release -o "$repoRoot\deploy\backend"
if ($LASTEXITCODE -ne 0) { throw "Backend publish failed" }

# 3. Take App Offline
Write-Host "3. Taking app offline..." -ForegroundColor Yellow
$appOfflineContent = @"
<!DOCTYPE html>
<html>
<head><title>Updating...</title></head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
    <h1>เว็บไซด์กำลังอยู่ระหว่างการอัปเดตระบบ</h1>
    <p>ระบบ Frontend และ Backend กำลังถูกรวมเข้าด้วยกันภายใต้ลิงก์เดียว กรุณารอสักครู่...</p>
</body>
</html>
"@
$tempAppOfflinePath = "$repoRoot\deploy\app_offline.htm"
Set-Content -Path $tempAppOfflinePath -Value $appOfflineContent -Force

# Upload app_offline.htm
$pwsh = if (Get-Command powershell -ErrorAction SilentlyContinue) { "powershell" } else { "pwsh" }
& $pwsh -ExecutionPolicy Bypass -File "$repoRoot\deploy\upload-ftp.ps1" `
    -Server $Server -Username $Username -Password $Password `
    -LocalPath "$repoRoot\deploy" -RemotePath $RemotePath -ExcludePaths $excludeList

Write-Host "App is offline. Waiting 5 seconds..."
Start-Sleep -Seconds 5

# 4. Upload App Files
Write-Host "4. Uploading application files (Frontend + Backend)..." -ForegroundColor Yellow
& $pwsh -ExecutionPolicy Bypass -File "$repoRoot\deploy\upload-ftp.ps1" `
    -Server $Server -Username $Username -Password $Password `
    -LocalPath "$repoRoot\deploy\backend" -RemotePath $RemotePath -ExcludePaths $excludeList

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
