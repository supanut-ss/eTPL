# Read-only diagnostic. Walks every user's transaction history in order and detects any
# point where BalanceAfter jumps by more than the transaction's own Amount explains.
# That gap is money that appeared/disappeared from the wallet without a matching logged
# transaction (e.g. the SS38 renewal revert-without-recharge bug).
#
# AUCTION_WIN is treated as a no-op on AvailableBalance (it was already debited earlier as AUCTION_BID),
# matching the original audit_wallets.ps1 logic.

$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)

    $cmd.CommandText = @"
SELECT t.transaction_id, t.UserId, u.user_id AS Username, t.Amount, t.Direction, t.Type, t.BalanceAfter, t.CreatedAt
FROM tbs_auction_transactions t
JOIN tbm_user u ON u.id = t.UserId
ORDER BY t.UserId, t.CreatedAt ASC, t.transaction_id ASC
"@
    $dt = New-Object System.Data.DataTable
    $adapter.Fill($dt) | Out-Null

    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host "BALANCE-CONTINUITY GAP REPORT (per user, chronological)" -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Yellow

    $byUser = @{}
    foreach ($row in $dt.Rows) {
        $uid = [int]$row["UserId"]
        if (-not $byUser.ContainsKey($uid)) { $byUser[$uid] = @{ Username = $row["Username"]; Rows = @() } }
        $byUser[$uid].Rows += $row
    }

    $totalGapUsers = 0
    $results = @()

    foreach ($uid in $byUser.Keys) {
        $username = $byUser[$uid].Username
        $rows = $byUser[$uid].Rows
        $prev = $null
        for ($i = 0; $i -lt $rows.Count; $i++) {
            $row = $rows[$i]
            if ($null -ne $prev) {
                $expected = [int]$prev["BalanceAfter"]
                if ($row["Type"] -ne "AUCTION_WIN") {
                    if ($row["Direction"] -eq "DEBIT") { $expected -= [int]$row["Amount"] }
                    elseif ($row["Direction"] -eq "CREDIT") { $expected += [int]$row["Amount"] }
                }
                $actual = [int]$row["BalanceAfter"]
                $gap = $actual - $expected
                if ($gap -ne 0) {
                    $totalGapUsers++
                    $results += [PSCustomObject]@{
                        Username = $username
                        UserId = $uid
                        Gap = $gap
                        PrevTxId = $prev["transaction_id"]
                        PrevBalanceAfter = $prev["BalanceAfter"]
                        PrevCreatedAt = $prev["CreatedAt"]
                        NextTxId = $row["transaction_id"]
                        NextType = $row["Type"]
                        NextBalanceAfter = $row["BalanceAfter"]
                        NextCreatedAt = $row["CreatedAt"]
                    }
                    Write-Host ("User: {0,-15} Gap: {1,6} | between tx #{2} (Bal={3}, {4}) -> tx #{5} ({6}, Bal={7}, {8})" -f `
                        $username, $gap, $prev["transaction_id"], $prev["BalanceAfter"], $prev["CreatedAt"], `
                        $row["transaction_id"], $row["Type"], $row["BalanceAfter"], $row["CreatedAt"]) -ForegroundColor Red
                }
            }
            $prev = $row
        }
    }

    Write-Host ""
    if ($totalGapUsers -eq 0) {
        Write-Host "OK: No balance-continuity gaps found for any user." -ForegroundColor Green
    } else {
        Write-Host "FOUND: $totalGapUsers gap(s) across users. See rows above." -ForegroundColor Red
        $results | Export-Csv -Path "$PSScriptRoot\balance_gaps_found.csv" -NoTypeInformation
        Write-Host "Details exported to balance_gaps_found.csv" -ForegroundColor Cyan
    }

} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
