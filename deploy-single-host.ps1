param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2",
    [string]$RemotePath = "thaipesleague.com" 
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

# 0. Preparation
if (!(Test-Path "$repoRoot\deploy")) { New-Item -Path "$repoRoot\deploy" -ItemType Directory }
if (Test-Path "$repoRoot\deploy\backend") { Remove-Item -Path "$repoRoot\deploy\backend" -Recurse -Force }

# 1. Build Frontend
Write-Host "1. Building Frontend..." -ForegroundColor Yellow
Set-Location "$repoRoot\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

# 2. Publish Backend (win-x86 for hosting compatibility)
Write-Host "2. Publishing Backend (win-x86)..." -ForegroundColor Yellow
Set-Location "$repoRoot\backend"
dotnet publish -c Release -r win-x86 --self-contained true -o "$repoRoot\deploy\backend"
if ($LASTEXITCODE -ne 0) { throw "Backend publish failed" }

# 3. Copy Frontend to Backend's wwwroot (Single Host Integration)
# This ensures static files are part of the published app
Write-Host "3. Integrating Frontend into Backend wwwroot..." -ForegroundColor Yellow
if (!(Test-Path "$repoRoot\deploy\backend\wwwroot")) { New-Item -Path "$repoRoot\deploy\backend\wwwroot" -ItemType Directory }
Copy-Item -Path "$repoRoot\frontend\dist\*" -Destination "$repoRoot\deploy\backend\wwwroot" -Recurse -Force

# 4. Create maintenance page
Write-Host "4. Creating maintenance page..." -ForegroundColor Yellow
$appOfflineContent = @"
<!DOCTYPE html>
<html lang="th-TH">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eTPL Maintenance</title>
    <style>
        body { font-family: 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .card { background: rgba(255,255,255,0.03); padding: 3rem; border-radius: 32px; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px); max-width: 450px; }
        h1 { margin: 0; font-size: 1.75rem; font-weight: 800; color: #f8fafc; }
        p { opacity: 0.7; margin-top: 1rem; font-size: 1rem; line-height: 1.6; }
        .accent { color: #3b82f6; font-weight: 800; }
    </style>
</head>
<body>
    <div class="card">
        <h1><span class="accent">eTPL</span> กำลังอัปเดตระบบ</h1>
        <p>เรากำลังปรับปรุงระบบเพื่อประสิทธิภาพที่ดีขึ้น<br>กรุณารอสักครู่ (ประมาณ 3-5 นาที)</p>
    </div>
</body>
</html>
"@
$tempAppOfflinePath = "$repoRoot\deploy\app_offline.htm"
Set-Content -Path $tempAppOfflinePath -Value $appOfflineContent -Force

# 5. Uploading...
$pwsh = if (Get-Command powershell -ErrorAction SilentlyContinue) { "powershell" } else { "pwsh" }

Write-Host "5. Taking app offline..." -ForegroundColor Yellow
& $pwsh -ExecutionPolicy Bypass -File "$repoRoot\deploy\upload-ftp.ps1" `
    -Server $Server -Username $Username -Password $Password `
    -LocalPath "$repoRoot\deploy\app_offline.htm" -RemotePath "$RemotePath/app_offline.htm"

Write-Host "App is offline. Waiting 5 seconds..."
Start-Sleep -Seconds 5

Write-Host "6. Uploading application files..." -ForegroundColor Yellow
& $pwsh -ExecutionPolicy Bypass -File "$repoRoot\deploy\upload-ftp.ps1" `
    -Server $Server -Username $Username -Password $Password `
    -LocalPath "$repoRoot\deploy\backend" -RemotePath $RemotePath

# 7. Bring App Online
Write-Host "7. Bringing app back online..." -ForegroundColor Yellow
$delReq = [System.Net.FtpWebRequest]::Create("ftp://$Server/$RemotePath/app_offline.htm")
$delReq.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
$delReq.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
$delReq.UsePassive = $true
try {
    $delResp = $delReq.GetResponse()
    $delResp.Close()
    Write-Host "app_offline.htm removed. Website is live!" -ForegroundColor Green
} catch {
    Write-Warning "Could not remove app_offline.htm automatically. Please delete it via FTP."
}

Remove-Item $tempAppOfflinePath -Force -ErrorAction SilentlyContinue
Set-Location $repoRoot
Write-Host "--- Deployment Complete! ---" -ForegroundColor Cyan
