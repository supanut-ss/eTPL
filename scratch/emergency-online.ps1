param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2"
)

$ErrorActionPreference = "Continue"

function Delete-FtpFile {
    param([string]$FtpUri)
    Write-Host "Attempting to delete $FtpUri"
    $req = [System.Net.FtpWebRequest]::Create($FtpUri)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
    $req.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
    $req.UsePassive = $false
    try {
        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "Success"
    } catch {
        Write-Host "Failed or already gone: $($_.Exception.Message)"
    }
}

Delete-FtpFile "ftp://$Server/apicore.thaipesleague.com/app_offline.htm"
Delete-FtpFile "ftp://$Server/httpdocs/app_offline.htm"
