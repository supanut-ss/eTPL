param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2",
    [switch]$CleanRemote
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

Set-Location $repoRoot

Copy-Item .\deploy\production-appsettings.json .\deploy\backend\appsettings.json -Force

$pwsh = if (Get-Command powershell -ErrorAction SilentlyContinue) { "powershell" } else { "pwsh" }

if ($CleanRemote) {
    & $pwsh -ExecutionPolicy Bypass -File .\deploy\delete-coreapi-dir.ps1 `
      -FtpServer $Server `
      -Username $Username `
      -Password $Password `
      -Directory coreapi.thaipesleague.com
}

& $pwsh -ExecutionPolicy Bypass -File .\deploy\upload-ftp.ps1 `
  -Server $Server `
  -Username $Username `
  -Password $Password `
  -LocalPath .\deploy\backend `
  -RemotePath coreapi.thaipesleague.com
