param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2",
    [string]$RemotePath = "coreapi.thaipesleague.com",
    [string]$Configuration = "Release",
    [string]$AppSettingsSource = "",
    [switch]$DryRun,
    [switch]$BuildOnly
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

Set-Location $repoRoot

$args = @{
  Server = $Server
  Username = $Username
  Password = $Password
  RemotePath = $RemotePath
  Configuration = $Configuration
}

if (-not [string]::IsNullOrWhiteSpace($AppSettingsSource)) {
  $args.AppSettingsSource = $AppSettingsSource
}

if ($DryRun) {
  $args.DryRun = $true
}

if ($BuildOnly) {
  $args.BuildOnly = $true
}

& .\deploy\deploy-backend.ps1 @args
