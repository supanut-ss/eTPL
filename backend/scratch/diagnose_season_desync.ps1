# Read-only diagnostic. Does not modify any data.
# Checks: (1) current season number per platform, (2) whether the DB has season-close markers
# for that season (which the fixed code now uses to decide "closed" instead of trusting the season field),
# (3) duplicate CONTRACT_RENEWAL_AUTO charges per (UserId, PlayerId, SeasonTag) across ALL users.

$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)

    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host "1. CURRENT SEASON PER PLATFORM (tbm_current_season)" -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Yellow
    $cmd.CommandText = "SELECT Platform, Season FROM tbm_current_season"
    $dt = New-Object System.Data.DataTable
    $adapter.Fill($dt) | Out-Null
    foreach ($r in $dt.Rows) {
        Write-Host ("  Platform={0} -> Season={1}" -f $r["Platform"], $r["Season"])
    }

    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host "2. SEASON-CLOSE MARKERS PRESENT PER SEASON NUMBER (PRIZE/CARD_DEDUCTION/AUTO_RELEASE_EXPIRED)" -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Yellow
    $cmd.CommandText = @"
SELECT
    CAST(SUBSTRING(Description, PATINDEX('%(Season %', Description) + 8,
        CHARINDEX(')', Description, PATINDEX('%(Season %', Description)) - PATINDEX('%(Season %', Description) - 8) AS INT) AS SeasonTag,
    Type,
    COUNT(*) AS Cnt
FROM tbs_auction_transactions
WHERE Type IN ('PRIZE','CARD_DEDUCTION','AUTO_RELEASE_EXPIRED')
  AND Description LIKE '%(Season %'
GROUP BY
    CAST(SUBSTRING(Description, PATINDEX('%(Season %', Description) + 8,
        CHARINDEX(')', Description, PATINDEX('%(Season %', Description)) - PATINDEX('%(Season %', Description) - 8) AS INT),
    Type
ORDER BY SeasonTag, Type
"@
    $dt2 = New-Object System.Data.DataTable
    $adapter.Fill($dt2) | Out-Null
    foreach ($r in $dt2.Rows) {
        Write-Host ("  Season {0} | {1,-20} | {2} row(s)" -f $r["SeasonTag"], $r["Type"], $r["Cnt"])
    }

    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host "3. DUPLICATE CONTRACT_RENEWAL_AUTO PER (User, Player, SeasonTag) - SHOULD ALL BE 1" -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Yellow
    $cmd.CommandText = @"
SELECT
    u.user_id AS Username,
    t.RelatedPlayerId,
    CAST(SUBSTRING(t.Description, PATINDEX('%(Season %', t.Description) + 8,
        CHARINDEX(')', t.Description, PATINDEX('%(Season %', t.Description)) - PATINDEX('%(Season %', t.Description) - 8) AS INT) AS SeasonTag,
    COUNT(*) AS Cnt,
    SUM(t.Amount) AS TotalCharged
FROM tbs_auction_transactions t
JOIN tbm_user u ON u.id = t.UserId
WHERE t.Type = 'CONTRACT_RENEWAL_AUTO'
  AND t.Description LIKE '%(Season %'
GROUP BY u.user_id, t.RelatedPlayerId,
    CAST(SUBSTRING(t.Description, PATINDEX('%(Season %', t.Description) + 8,
        CHARINDEX(')', t.Description, PATINDEX('%(Season %', t.Description)) - PATINDEX('%(Season %', t.Description) - 8) AS INT)
HAVING COUNT(*) > 1
ORDER BY Username
"@
    $dt3 = New-Object System.Data.DataTable
    $adapter.Fill($dt3) | Out-Null
    if ($dt3.Rows.Count -eq 0) {
        Write-Host "  OK: No duplicate CONTRACT_RENEWAL_AUTO charges found." -ForegroundColor Green
    } else {
        foreach ($r in $dt3.Rows) {
            Write-Host ("  DUPLICATE: {0} | PlayerId={1} | Season={2} | Count={3} | TotalCharged={4}" -f $r["Username"], $r["RelatedPlayerId"], $r["SeasonTag"], $r["Cnt"], $r["TotalCharged"]) -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host "4. LEFTOVER CONTRACT_RENEWAL_REVERT ROWS (should be 0 unless the new safeguard has already run)" -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Yellow
    $cmd.CommandText = "SELECT COUNT(*) AS Cnt FROM tbs_auction_transactions WHERE Type = 'CONTRACT_RENEWAL_REVERT'"
    $dt4 = New-Object System.Data.DataTable
    $adapter.Fill($dt4) | Out-Null
    Write-Host ("  CONTRACT_RENEWAL_REVERT rows: {0}" -f $dt4.Rows[0]["Cnt"])

} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
