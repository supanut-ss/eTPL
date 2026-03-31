param(
    [string]$Server = "ftp.thaipesleague.com",
    [string]$Username = "thaipes",
    [string]$Password = "Ws7#3es2",
    [string]$RemotePath = "httpdocs",
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
}

if ($DryRun) {
  $args.DryRun = $true
}

if ($BuildOnly) {
  $args.BuildOnly = $true
}

& .\deploy\deploy-frontend.ps1 @args
