$Username = "thaipes"
$Password = "Ws7#3es2"
$Server = "ftp.thaipesleague.com"

$req = [System.Net.FtpWebRequest]::Create("ftp://$Server/")
$req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
$req.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
$req.UsePassive = $true
$resp = $req.GetResponse()
$reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
$count = 0
while ($null -ne ($line = $reader.ReadLine()) -and $count -lt 100) {
    Write-Host $line
    $count++
}
$reader.Close()
$resp.Close()
