# Fixes the desynced season counter (tbm_current_season.Season) that got stuck because
# OpenSeasonAsync's old idempotency check trusted the season field instead of real close-markers.
#
# This script does NOT touch any wallet/transaction data - only the season counter.
# Run diagnose_season_desync.ps1 FIRST and confirm section 3 has no unexpected duplicates
# before running this.
#
# Usage: powershell -File fix_season_number.ps1 -Platform "PS5" -ExpectedCurrent 38 -TargetSeason 39

param(
    [Parameter(Mandatory=$true)] [string]$Platform,
    [Parameter(Mandatory=$true)] [int]$ExpectedCurrent,
    [Parameter(Mandatory=$true)] [int]$TargetSeason
)

$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()

    $cmd.CommandText = "SELECT Season FROM tbm_current_season WHERE Platform = @p"
    $cmd.Parameters.Clear() | Out-Null
    $cmd.Parameters.AddWithValue("@p", $Platform) | Out-Null
    $current = $cmd.ExecuteScalar()

    if ($null -eq $current) {
        Write-Host "No row found for Platform='$Platform' in tbm_current_season. Aborting." -ForegroundColor Red
        return
    }

    Write-Host "Current Season for Platform '$Platform' is: $current" -ForegroundColor Cyan

    if ([int]$current -ne $ExpectedCurrent) {
        Write-Host "MISMATCH: expected current season $ExpectedCurrent but found $current. Aborting to avoid fixing the wrong thing." -ForegroundColor Red
        return
    }

    Write-Host "About to UPDATE tbm_current_season SET Season = $TargetSeason WHERE Platform = '$Platform' (was $current)" -ForegroundColor Yellow
    $confirm = Read-Host "Type YES to proceed"
    if ($confirm -ne "YES") {
        Write-Host "Cancelled. No changes made." -ForegroundColor Yellow
        return
    }

    $cmd.CommandText = "UPDATE tbm_current_season SET Season = @s WHERE Platform = @p AND Season = @old"
    $cmd.Parameters.Clear() | Out-Null
    $cmd.Parameters.AddWithValue("@s", $TargetSeason) | Out-Null
    $cmd.Parameters.AddWithValue("@p", $Platform) | Out-Null
    $cmd.Parameters.AddWithValue("@old", $ExpectedCurrent) | Out-Null
    $rows = $cmd.ExecuteNonQuery()

    if ($rows -eq 1) {
        Write-Host "SUCCESS: Season updated to $TargetSeason for Platform '$Platform'." -ForegroundColor Green
    } else {
        Write-Host "WARNING: Expected to update 1 row but updated $rows. Please verify manually." -ForegroundColor Red
    }

} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
