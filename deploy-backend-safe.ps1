param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2",
    [string]$BackendPath = ".\deploy\backend"
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

function Upload-File {
    param(
        [string]$FtpUri,
        [string]$LocalFile
    )
    
    $req = [System.Net.FtpWebRequest]::Create($FtpUri)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $req.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
    $req.UsePassive = $false
    $req.UseBinary = $true
    $req.KeepAlive = $false
    $req.Timeout = 30000
    $req.ReadWriteTimeout = 60000
    
    $fileStream = [System.IO.File]::OpenRead($LocalFile)
    $reqStream = $req.GetRequestStream()
    $fileStream.CopyTo($reqStream)
    $reqStream.Close()
    $fileStream.Close()
    
    $resp = $req.GetResponse()
    $resp.Close()
}

Set-Location $repoRoot

# 1. Upload app_offline.htm to take app offline
Write-Host "Uploading app_offline.htm to stop the app..."
$appOfflineContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Maintenance</title>
</head>
<body style="font-family: Arial; text-align: center;">
    <h1>App Under Maintenance</h1>
    <p>The application is currently being updated. Please try again in a few moments.</p>
</body>
</html>
"@

$tempAppOfflinePath = "$repoRoot\deploy\app_offline.htm"
Set-Content -Path $tempAppOfflinePath -Value $appOfflineContent -Force

Upload-File "ftp://$Server/apicore.thaipesleague.com/app_offline.htm" $tempAppOfflinePath
Remove-Item $tempAppOfflinePath -Force

Write-Host "App offline. Waiting 10 seconds for requests to complete..."
Start-Sleep -Seconds 10

# 2. Copy production appsettings
Copy-Item .\deploy\production-appsettings.json .\deploy\backend\appsettings.json -Force

# 3. Deploy backend using existing upload script
$pwsh = if (Get-Command powershell -ErrorAction SilentlyContinue) { "powershell" } else { "pwsh" }

& $pwsh -ExecutionPolicy Bypass -File .\deploy\upload-ftp.ps1 `
  -Server $Server `
  -Username $Username `
  -Password $Password `
  -LocalPath $BackendPath `
        -RemotePath "apicore.thaipesleague.com"

# 4. Remove app_offline.htm to bring app back online
Write-Host "Removing app_offline.htm to bring app back online..."
$tempAppOfflinePath = "$repoRoot\deploy\app_offline.htm"
Set-Content -Path $tempAppOfflinePath -Value "offline" -Force

$delReq = [System.Net.FtpWebRequest]::Create("ftp://$Server/apicore.thaipesleague.com/app_offline.htm")
$delReq.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
$delReq.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
$delReq.UsePassive = $false
$delReq.Timeout = 30000

try {
    $delResp = $delReq.GetResponse()
    $delResp.Close()
    Write-Host "app_offline.htm removed. App is back online!"
} catch {
    Write-Warning "Could not remove app_offline.htm: $_"
}

Remove-Item $tempAppOfflinePath -Force -ErrorAction SilentlyContinue

Write-Host "Backend deployment complete!"
