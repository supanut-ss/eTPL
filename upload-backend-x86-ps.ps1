# Upload all files from backend-x86 to FTP server using PowerShell
$sourceDir = "D:\Git\eTPL\deploy\backend-x86"
$ftpHost = "ftp.thaipesleague.com"
$ftpUser = "thaipes"
$ftpPass = "Ws7#3es2"
$ftpPath = "/coreapi.thaipesleague.com"

$files = Get-ChildItem -Path $sourceDir -File -Recurse

Write-Host "Uploading $($files.Count) files to $ftpHost..."

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($sourceDir.Length + 1)
    $ftpFullPath = "$ftpPath/$relativePath"
    $ftpFullPath = $ftpFullPath -replace '\\', '/'
    
    try {
        $ftpRequest = [System.Net.FtpWebRequest]::Create("ftp://$ftpHost$ftpFullPath")
        $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        
        $fileStream = [System.IO.File]::OpenRead($file.FullName)
        $ftpRequest.GetRequestStream() | ForEach-Object {
            $fileStream.CopyTo($_)
            $_.Close()
        }
        $ftpRequest.GetResponse().Close()
        
        Write-Host "OK: $relativePath" -ForegroundColor Green
    } catch {
        Write-Host "FAIL: $relativePath - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Upload complete!"
