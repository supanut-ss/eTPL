$Username = "thaipes"
$Password = "Ws7#3es2"
$Server = "ftp.thaipesleague.com"

function List-FtpDir {
    param([string]$path)
    Write-Host "Listing: $path" -ForegroundColor Cyan
    $req = [System.Net.FtpWebRequest]::Create("ftp://$Server/$path")
    $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    $req.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
    $req.UsePassive = $true
    try {
        $resp = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $content = $reader.ReadToEnd()
        $reader.Close()
        $resp.Close()
        Write-Host $content
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

List-FtpDir ""
List-FtpDir "httpdocs"
List-FtpDir "apicore.thaipesleague.com"
