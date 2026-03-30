param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2"
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

Set-Location $repoRoot

powershell -ExecutionPolicy Bypass -File .\deploy\upload-ftp.ps1 `
  -Server $Server `
  -Username $Username `
  -Password $Password `
  -LocalPath .\deploy\frontend `
  -RemotePath httpdocs
