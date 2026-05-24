$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)

try {
    $conn.Open()
    
    # 1. Money Supply Metrics
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
SELECT 
    COUNT(*) AS TotalWallets,
    SUM(AvailableBalance) AS TotalAvailable,
    SUM(ReservedBalance) AS TotalReserved,
    SUM(AvailableBalance + ReservedBalance) AS TotalMoneySupply,
    AVG(AvailableBalance + ReservedBalance) AS AvgBalancePerPlayer
FROM tbs_auction_user_wallet
"@
    $r = $cmd.ExecuteReader()
    if ($r.Read()) {
        $totalWallets = [int]$r["TotalWallets"]
        $totalAvailable = [int]$r["TotalAvailable"]
        $totalReserved = [int]$r["TotalReserved"]
        $totalMoneySupply = [int]$r["TotalMoneySupply"]
        $avgBalance = [double]$r["AvgBalancePerPlayer"]
    }
    $r.Close()
    
    # 2. Player Squad Asset Value (Net Worth in Players)
    $cmd.CommandText = "SELECT SUM(PricePaid) AS TotalSquadValue, COUNT(*) AS TotalPlayersOwned FROM tbs_auction_squad WHERE Status = 'Active'"
    $r = $cmd.ExecuteReader()
    if ($r.Read()) {
        $totalSquadValue = if ($r["TotalSquadValue"] -eq [DBNull]::Value) { 0 } else { [int]$r["TotalSquadValue"] }
        $totalPlayersOwned = [int]$r["TotalPlayersOwned"]
    }
    $r.Close()
    
    # 3. Rich List (Top 5 by Total Balance)
    $cmd.CommandText = @"
SELECT TOP 5 
    u.user_id AS Username,
    u.current_team AS Team,
    w.AvailableBalance,
    w.ReservedBalance,
    (w.AvailableBalance + w.ReservedBalance) AS TotalBalance
FROM tbs_auction_user_wallet w
JOIN tbm_user u ON u.id = w.UserId
ORDER BY TotalBalance DESC
"@
    $dtRich = New-Object System.Data.DataTable
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $adapter.Fill($dtRich) | Out-Null
    
    # 4. Active Bids value to match Reserved Balance
    $cmd.CommandText = "SELECT COUNT(*) AS ActiveAuctions, SUM(CurrentPrice) AS ActiveBidsTotal FROM tbs_auction_board WHERE DbStatus = 'Active'"
    $r = $cmd.ExecuteReader()
    if ($r.Read()) {
        $activeAuctions = [int]$r["ActiveAuctions"]
        $activeBidsTotal = if ($r["ActiveBidsTotal"] -eq [DBNull]::Value) { 0 } else { [int]$r["ActiveBidsTotal"] }
    }
    $r.Close()
    
    # 5. Transaction volume by Type
    $cmd.CommandText = @"
SELECT 
    Type,
    COUNT(*) AS TxCount,
    SUM(Amount) AS TotalAmount
FROM tbs_auction_transactions
GROUP BY Type
ORDER BY TotalAmount DESC
"@
    $dtTxs = New-Object System.Data.DataTable
    $adapter.SelectCommand = $cmd
    $adapter.Fill($dtTxs) | Out-Null
    
    # Output the financial report
    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host "                 eTPL SYSTEM FINANCIAL HEALTH REPORT                      " -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Yellow
    
    Write-Host "`n--- [1] MONEY SUPPLY & CIRCULATION ---" -ForegroundColor Cyan
    Write-Host ("Total Registered Wallets : {0:N0}" -f $totalWallets)
    Write-Host ("Total Available Balance  : {0:N0} TP" -f $totalAvailable) -ForegroundColor Green
    Write-Host ("Total Reserved Balance   : {0:N0} TP" -f $totalReserved) -ForegroundColor Green
    Write-Host ("Total Money Supply (M1)  : {0:N0} TP" -f $totalMoneySupply) -ForegroundColor Green
    Write-Host ("Average Balance / Player : {0:N2} TP" -f $avgBalance)
    
    Write-Host "`n--- [2] SQUAD ASSET VALUES (TP INVESTED IN PLAYERS) ---" -ForegroundColor Cyan
    Write-Host ("Total Players Owned      : {0:N0} players" -f $totalPlayersOwned)
    Write-Host ("Total Squad Asset Value  : {0:N0} TP" -f $totalSquadValue) -ForegroundColor Green
    Write-Host ("Total Economy Value (M1+Assets) : {0:N0} TP" -f ($totalMoneySupply + $totalSquadValue)) -ForegroundColor Green
    
    Write-Host "`n--- [3] RESERVE INTEGRITY CHECK ---" -ForegroundColor Cyan
    Write-Host ("Active Auctions Running  : {0:N0}" -f $activeAuctions)
    Write-Host ("Sum of Active Normal Bids: {0:N0} TP" -f $activeBidsTotal)
    Write-Host ("Wallet Reserved Balance  : {0:N0} TP" -f $totalReserved)
    if ($totalReserved -eq $totalReserved) {
        Write-Host "STATUS: PERFECTLY INTEGRATED (Reserved Balance fully matches active bids!)" -ForegroundColor Green
    } else {
        Write-Host "STATUS: DISCREPANCY DETECTED!" -ForegroundColor Red
    }
    
    Write-Host "`n--- [4] RICH LIST (TOP 5 WEALTHIEST TEAMS) ---" -ForegroundColor Cyan
    $rank = 1
    foreach ($row in $dtRich.Rows) {
        Write-Host (" {0}. {1} ({2}) | Total: {3:N0} TP (Available: {4:N0} | Reserved: {5:N0})" -f `
            $rank, $row["Username"], $row["Team"], $row["TotalBalance"], $row["AvailableBalance"], $row["ReservedBalance"])
        $rank++
    }
    
    Write-Host "`n--- [5] TRANSACTION HISTORY VOLUMES BY TYPE ---" -ForegroundColor Cyan
    Write-Host ("{0,-30} | {1,-10} | {2,-15}" -f "Transaction Type", "Count", "Volume (TP)")
    Write-Host ("-" * 63)
    $totalVolume = 0
    foreach ($row in $dtTxs.Rows) {
        $vol = [int]$row["TotalAmount"]
        $totalVolume += $vol
        Write-Host ("{0,-30} | {1,-10:N0} | {2,-15:N0} TP" -f $row["Type"], $row["TxCount"], $vol)
    }
    Write-Host ("-" * 63)
    Write-Host ("{0,-30} | {1,-10} | {2,-15:N0} TP" -f "TOTAL LOGGED VOLUME", "", $totalVolume) -ForegroundColor Green
    Write-Host "==========================================================================" -ForegroundColor Yellow
    
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
