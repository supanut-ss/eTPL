$Username = "thaipes"
$Password = "Ws7#3es2"
$Server = "ftp.thaipesleague.com"

function List-Ftp {
    param([string]$path)
    $req = [System.Net.FtpWebRequest]::Create("ftp://$Server/$path")
    $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    $req.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
    $req.UsePassive = $true
    $resp = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Host "--- Content of $path ---"
    Write-Host ($reader.ReadToEnd())
    $reader.Close()
    $resp.Close()
}

List-Ftp ""
