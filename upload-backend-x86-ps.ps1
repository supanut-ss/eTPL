# Upload all files from backend-net8-x64 to FTP server using PowerShell (Active mode)
$sourceDir = "D:\Git\eTPL\deploy\backend-net8-x64"
$ftpHost = "ftp.thaipesleague.com"
$ftpUser = "thaipes"
$ftpPass = "Ws7#3es2"
$ftpPath = "/coreapi.thaipesleague.com"

$files = Get-ChildItem -Path $sourceDir -File

Write-Host "Uploading $($files.Count) root files to $ftpHost..."
$ok = 0; $fail = 0

foreach ($file in $files) {
    $ftpFullPath = "$ftpPath/$($file.Name)"
    
    try {
        $ftpRequest = [System.Net.FtpWebRequest]::Create("ftp://$ftpHost$ftpFullPath")
        $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftpRequest.UsePassive = $false
        $ftpRequest.UseBinary = $true
        $ftpRequest.KeepAlive = $false
        
        $fileBytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $ftpRequest.ContentLength = $fileBytes.Length
        $requestStream = $ftpRequest.GetRequestStream()
        $requestStream.Write($fileBytes, 0, $fileBytes.Length)
        $requestStream.Close()
        $ftpRequest.GetResponse().Close()
        
        $ok++
        Write-Host "OK ($ok): $($file.Name)"
    } catch {
        $fail++
        Write-Host "FAIL: $($file.Name) - $($_.Exception.Message)"
    }
}

Write-Host "Done! OK: $ok, FAIL: $fail"
