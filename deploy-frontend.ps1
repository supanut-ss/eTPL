param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2"
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

Set-Location $repoRoot

$pwsh = if (Get-Command powershell -ErrorAction SilentlyContinue) { "powershell" } else { "pwsh" }

& $pwsh -ExecutionPolicy Bypass -File .\deploy\upload-ftp.ps1 `
  -Server $Server `
  -Username $Username `
  -Password $Password `
  -LocalPath .\deploy\frontend `
  -RemotePath httpdocs `
  -ExcludePaths "_image/CLUB_LOGO"
