param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2",
  [switch]$DryRun,
  [switch]$BuildOnly,
  [string]$BackendRemotePath = "coreapi.thaipesleague.com",
  [string]$FrontendRemotePath = "httpdocs",
  [string]$Configuration = "Release",
  [string]$AppSettingsSource = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

Set-Location $repoRoot

$backendArgs = @{
  Server = $Server
  Username = $Username
  Password = $Password
  RemotePath = $BackendRemotePath
  Configuration = $Configuration
}

if (-not [string]::IsNullOrWhiteSpace($AppSettingsSource)) {
  $backendArgs.AppSettingsSource = $AppSettingsSource
}

if ($DryRun) {
  $backendArgs.DryRun = $true
}

if ($BuildOnly) {
  $backendArgs.BuildOnly = $true
}

& .\deploy-backend.ps1 @backendArgs

$frontendArgs = @{
  Server = $Server
  Username = $Username
  Password = $Password
  RemotePath = $FrontendRemotePath
}

if ($DryRun) {
  $frontendArgs.DryRun = $true
}

if ($BuildOnly) {
  $frontendArgs.BuildOnly = $true
}

& .\deploy-frontend.ps1 @frontendArgs
