# Safe backend deployment for x86 (32-bit) build
# Strategy: app_offline.htm -> upload files -> remove app_offline.htm

$ftpServer = "ftp://ftp.thaipesleague.com"
$username = "thaipes"
$password = "Ws7#3es2"
$remotePath = "/coreapi.thaipesleague.com"
$localPath = "D:\Git\eTPL\deploy\backend-x86"

Write-Host "Safe Backend (x86) Deployment Script"
Write-Host "====================================="
Write-Host "Local Source: $localPath"
Write-Host "Remote Target: $ftpServer$remotePath"
Write-Host ""

# Step 1: Upload app_offline.htm
Write-Host "Uploading app_offline.htm to stop the app..."

$appOfflineSource = "D:\Git\eTPL\deploy\app-offline\app_offline.htm"
if (!(Test-Path $appOfflineSource)) {
    Write-Host "ERROR: app_offline.htm not found at $appOfflineSource"
    exit 1
}

$ftpCommand = @"
open $ftpServer
$username
$password
cd $remotePath
put "$appOfflineSource"
quit
"@

$ftpCommand | ftp -n -s:- | Out-Null
Write-Host "SUCCESS: app_offline.htm uploaded. App is now offline."
Write-Host ""

# Step 2: Wait for requests to complete
Write-Host "App offline. Waiting 10 seconds for requests to complete..."
Start-Sleep -Seconds 10
Write-Host "SUCCESS: Grace period completed."
Write-Host ""

# Step 3: Upload all files
Write-Host "Uploading backend files from $localPath..."
Write-Host "This may take several minutes (~250MB)..."

$uploadScript = @"
open $ftpServer
$username
$password
cd $remotePath
prompt
mput "$localPath\*"
quit
"@

$uploadScript | ftp -n -s:-

Write-Host "SUCCESS: Backend files uploaded."
Write-Host ""

# Step 4: Remove app_offline.htm
Write-Host "Removing app_offline.htm to restart the app..."

$deleteScript = @"
open $ftpServer
$username
$password
cd $remotePath
delete app_offline.htm
quit
"@

$deleteScript | ftp -n -s:-
Write-Host "SUCCESS: app_offline.htm removed. App is restarting..."
Write-Host ""

Write-Host "Backend deployment complete!"
Write-Host "Waiting for app to restart (60 seconds)..."
Start-Sleep -Seconds 60
Write-Host "SUCCESS: App restart should be complete. Test the API endpoint."
