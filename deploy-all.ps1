param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2",
    [switch]$CleanBackend
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

Set-Location $repoRoot

powershell -ExecutionPolicy Bypass -File .\deploy-backend.ps1 `
  -Server $Server `
  -Username $Username `
  -Password $Password `
  -CleanRemote:$CleanBackend

powershell -ExecutionPolicy Bypass -File .\deploy-frontend.ps1 `
  -Server $Server `
  -Username $Username `
  -Password $Password
