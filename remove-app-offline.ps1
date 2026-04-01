param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2"
)

$ErrorActionPreference = "Stop"

function Delete-FtpFile {
    param(
        [string]$FtpUri
    )
    
    $req = [System.Net.FtpWebRequest]::Create($FtpUri)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
    $req.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
    $req.UsePassive = $false
    $req.Timeout = 30000
    
    try {
        $resp = $req.GetResponse()
        $resp.Close()
        return $true
    } catch {
        return $false
    }
}

Write-Host "Removing app_offline.htm..."
if (Delete-FtpFile "ftp://$Server/apicore.thaipesleague.com/app_offline.htm") {
    Write-Host "app_offline.htm removed successfully"
} else {
    Write-Host "app_offline.htm not found or already removed"
}

Write-Host "Rebuilding backend with self-contained runtime..."

