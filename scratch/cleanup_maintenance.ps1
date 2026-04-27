$Username = "thaipes"
$Password = "Ws7#3es2"
$Server = "ftp.thaipesleague.com"
$RemotePath = "httpdocs"

Write-Host "Attempting to delete app_offline.htm from httpdocs..."
$uri = "ftp://$Server/$RemotePath/app_offline.htm"
$req = [System.Net.FtpWebRequest]::Create($uri)
$req.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
$req.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
$req.UsePassive = $true

try {
    $resp = $req.GetResponse()
    $resp.Close()
    Write-Host "Successfully deleted app_offline.htm. Website should be LIVE." -ForegroundColor Green
} catch {
    Write-Host "Failed to delete: $($_.Exception.Message)" -ForegroundColor Red
}
