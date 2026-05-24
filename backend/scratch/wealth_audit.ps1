$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)

try {
    $conn.Open()
    
    # 1. Fetch all users
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT id, user_id, current_team FROM tbm_user"
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dtUsers = New-Object System.Data.DataTable
    $adapter.Fill($dtUsers) | Out-Null
    
    # 2. Fetch all wallets
    $cmd.CommandText = "SELECT UserId, AvailableBalance, ReservedBalance FROM tbs_auction_user_wallet"
    $dtWallets = New-Object System.Data.DataTable
    $adapter.Fill($dtWallets) | Out-Null
    
    $wallets = @{}
    foreach ($row in $dtWallets.Rows) {
        $wallets[[int]$row["UserId"]] = $row
    }
    
    # 3. Fetch all squad values by user
    # Note: We must sum PricePaid for owned players. Owned players are non-loan (IsLoan = 0).
    $cmd.CommandText = "SELECT UserId, SUM(PricePaid) AS SquadValue, COUNT(*) AS PlayerCount FROM tbs_auction_squad WHERE IsLoan = 0 GROUP BY UserId"
    $dtSquads = New-Object System.Data.DataTable
    $adapter.Fill($dtSquads) | Out-Null
    
    $squads = @{}
    foreach ($row in $dtSquads.Rows) {
        $squads[[int]$row["UserId"]] = $row
    }
    
    # 4. Fetch transactions to see bonuses, renewals, transfers, releases
    # Group by UserId and Type to analyze why they differ from 1930
    $cmd.CommandText = @"
SELECT 
    UserId, 
    Type, 
    SUM(Amount) AS TotalAmount, 
    COUNT(*) AS Count
FROM tbs_auction_transactions 
GROUP BY UserId, Type
"@
    $dtTxs = New-Object System.Data.DataTable
    $adapter.Fill($dtTxs) | Out-Null
    
    $txSummary = @{}
    foreach ($row in $dtTxs.Rows) {
        $uId = [int]$row["UserId"]
        if (-not $txSummary.ContainsKey($uId)) {
            $txSummary[$uId] = @{}
        }
        $txSummary[$uId][$row["Type"]] = @{
            Amount = [int]$row["TotalAmount"]
            Count = [int]$row["Count"]
        }
    }
    
    # Output the report
    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host "                TOTAL WEALTH & BUDGET INTEGRITY AUDIT                    " -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host ("{0,-15} | {1,-10} | {2,-10} | {3,-10} | {4,-10} | {5,-10}" -f "Username", "Available", "Reserved", "Squad Val", "Total Wealth", "Diff vs 1930")
    Write-Host ("-" * 74)
    
    $lessThan1930 = 0
    $equalTo1930 = 0
    $moreThan1930 = 0
    
    $details = @()
    
    foreach ($row in $dtUsers.Rows) {
        $uId = [int]$row["id"]
        $username = $row["user_id"]
        
        $wallet = $wallets[$uId]
        $avail = if ($null -eq $wallet) { 0 } else { [int]$wallet["AvailableBalance"] }
        $res = if ($null -eq $wallet) { 0 } else { [int]$wallet["ReservedBalance"] }
        
        $squad = $squads[$uId]
        $sqVal = if ($null -eq $squad -or $squad["SquadValue"] -eq [DBNull]::Value) { 0 } else { [int]$squad["SquadValue"] }
        $playerCount = if ($null -eq $squad) { 0 } else { [int]$squad["PlayerCount"] }
        
        $totalWealth = $avail + $res + $sqVal
        $diff = $totalWealth - 1930
        
        # Analyze why
        $reasons = @()
        $uTxs = $txSummary[$uId]
        if ($null -ne $uTxs) {
            # CONTRACT_RENEWAL decreases wealth
            if ($uTxs.ContainsKey("CONTRACT_RENEWAL")) {
                $reasons += ("Renewals: -{0} TP" -f $uTxs["CONTRACT_RENEWAL"].Amount)
            }
            # FREE_RELEASE can cause loss if they got less refund than PricePaid
            # We can check if FREE_RELEASE is logged. 
            if ($uTxs.ContainsKey("FREE_RELEASE")) {
                $reasons += ("Releases: +{0} TP" -f $uTxs["FREE_RELEASE"].Amount)
            }
            # BONUS increases wealth
            if ($uTxs.ContainsKey("BONUS")) {
                $reasons += ("Bonuses: +{0} TP" -f $uTxs["BONUS"].Amount)
            }
            # TRANSFER_BUY and TRANSFER_SELL profits/losses
            # Buyer pays fee (Available -= fee, Squad += fee -> net 0).
            # Seller gets fee (Available += fee, loses player of oldPrice paid -> net is fee - oldPrice).
            # Let's see: we can calculate total transfer earnings/spending in transactions.
            if ($uTxs.ContainsKey("TRANSFER_SELL")) {
                $reasons += ("Player Sales: +{0} TP" -f $uTxs["TRANSFER_SELL"].Amount)
            }
            if ($uTxs.ContainsKey("TRANSFER_BUY")) {
                $reasons += ("Player Buys: -{0} TP" -f $uTxs["TRANSFER_BUY"].Amount)
            }
            if ($uTxs.ContainsKey("LOAN_FEE")) {
                $reasons += ("Loan Paid: -{0} TP" -f $uTxs["LOAN_FEE"].Amount)
            }
            if ($uTxs.ContainsKey("LOAN_INCOME")) {
                $reasons += ("Loan Recv: +{0} TP" -f $uTxs["LOAN_INCOME"].Amount)
            }
        }
        
        $reasonStr = $reasons -join ", "
        if ($reasonStr -eq "") { $reasonStr = "No transactions affecting wealth" }
        
        if ($diff -lt 0) { $lessThan1930++ }
        elseif ($diff -eq 0) { $equalTo1930++ }
        else { $moreThan1930++ }
        
        $item = @{
            Username = $username
            Avail = $avail
            Res = $res
            SqVal = $sqVal
            Total = $totalWealth
            Diff = $diff
            Reason = $reasonStr
        }
        $details += $item
        
        $color = "Gray"
        if ($diff -lt 0) { $color = "Red" }
        elseif ($diff -gt 0) { $color = "Green" }
        
        Write-Host ("{0,-15} | {1,10:N0} | {2,10:N0} | {3,10:N0} | {4,10:N0} | {5,10:N0}" -f `
            $username, $avail, $res, $sqVal, $totalWealth, $diff) -ForegroundColor $color
    }
    
    Write-Host ("-" * 74)
    Write-Host "SUMMARY OF WEALTH DISTRIBUTION:" -ForegroundColor Yellow
    Write-Host "  Players with Wealth < 1930 TP : $lessThan1930" -ForegroundColor Red
    Write-Host "  Players with Wealth = 1930 TP : $equalTo1930" -ForegroundColor Gray
    Write-Host "  Players with Wealth > 1930 TP : $moreThan1930" -ForegroundColor Green
    Write-Host "==========================================================================" -ForegroundColor Yellow
    
    # Export full details object to context for modeling
    $details | ConvertTo-Json | Out-Null
    
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
