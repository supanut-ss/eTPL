$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)

try {
    $conn.Open()
    
    # 1. Fetch all leaks
    $sqlFetchLeaks = @"
SELECT 
    t.UserId,
    u.user_id AS Username,
    t.RelatedAuctionId,
    ab.DbStatus,
    ab.PlayerId,
    pp.player_name AS PlayerName,
    SUM(CASE WHEN t.Type = 'AUCTION_BID' THEN t.Amount ELSE 0 END) -
    SUM(CASE WHEN t.Type IN ('AUCTION_REFUND', 'FINAL_BID_REFUND', 'AUCTION_CANCELLED_SEASON_END') THEN t.Amount ELSE 0 END) -
    SUM(CASE WHEN t.Type = 'AUCTION_WIN' THEN t.Amount ELSE 0 END) AS NetReserved
FROM tbs_auction_transactions t
JOIN tbm_user u ON u.id = t.UserId
LEFT JOIN tbs_auction_board ab ON ab.auction_id = t.RelatedAuctionId
LEFT JOIN pes_player_team pp ON pp.id_player = ab.PlayerId
WHERE ab.DbStatus IN ('Sold', 'Cancelled') OR ab.DbStatus IS NULL
GROUP BY t.UserId, u.user_id, t.RelatedAuctionId, ab.DbStatus, ab.PlayerId, pp.player_name
HAVING SUM(CASE WHEN t.Type = 'AUCTION_BID' THEN t.Amount ELSE 0 END) -
       SUM(CASE WHEN t.Type IN ('AUCTION_REFUND', 'FINAL_BID_REFUND', 'AUCTION_CANCELLED_SEASON_END') THEN t.Amount ELSE 0 END) -
       SUM(CASE WHEN t.Type = 'AUCTION_WIN' THEN t.Amount ELSE 0 END) <> 0
ORDER BY t.UserId, t.RelatedAuctionId
"@
    
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sqlFetchLeaks
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dtLeaks = New-Object System.Data.DataTable
    $adapter.Fill($dtLeaks) | Out-Null
    
    if ($dtLeaks.Rows.Count -eq 0) {
        Write-Host "No leaks found in the system. Everything is already perfectly balanced!" -ForegroundColor Green
        return
    }
    
    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host "                 EXECUTING TP WALLET ADJUSTMENT FIX                       " -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host "Found $($dtLeaks.Rows.Count) leaks to fix. Starting database transaction..." -ForegroundColor Cyan
    
    # Start SQL transaction
    $transaction = $conn.BeginTransaction()
    
    try {
        $count = 0
        foreach ($row in $dtLeaks.Rows) {
            $userId = [int]$row["UserId"]
            $username = $row["Username"]
            
            $auctionId = $null
            if ($row["RelatedAuctionId"] -ne [DBNull]::Value) {
                $auctionId = [int]$row["RelatedAuctionId"]
            }
            
            $playerId = $null
            if ($row["PlayerId"] -ne [DBNull]::Value) {
                $playerId = [int]$row["PlayerId"]
            }
            
            $playerName = "Unknown"
            if ($row["PlayerName"] -ne [DBNull]::Value) {
                $playerName = $row["PlayerName"]
            }
            
            $netReserved = [int]$row["NetReserved"]
            
            $execCmd = $conn.CreateCommand()
            $execCmd.Transaction = $transaction
            
            $aidParam = [DBNull]::Value
            if ($null -ne $auctionId) { $aidParam = $auctionId }
            
            $pidParam = [DBNull]::Value
            if ($null -ne $playerId) { $pidParam = $playerId }
            
            if ($netReserved -gt 0) {
                # Positive leak: Never refunded
                # Action: Credit AvailableBalance (+netReserved), Debit ReservedBalance (-netReserved)
                $amount = $netReserved
                $desc = "[Recovery] Refund for unrefunded bid on $playerName (Auction $auctionId)"
                
                Write-Host "Fixing User: $username (ID: $userId) | positive leak on $playerName | Crediting $amount TP" -ForegroundColor Green
                
                # Update Wallet
                $execCmd.CommandText = "UPDATE tbs_auction_user_wallet SET AvailableBalance = AvailableBalance + @Amt, ReservedBalance = ReservedBalance - @Amt WHERE UserId = @Uid"
                $execCmd.Parameters.AddWithValue("@Amt", $amount) | Out-Null
                $execCmd.Parameters.AddWithValue("@Uid", $userId) | Out-Null
                $execCmd.ExecuteNonQuery() | Out-Null
                $execCmd.Parameters.Clear()
                
                # Record Transaction
                $execCmd.CommandText = @"
INSERT INTO tbs_auction_transactions (UserId, Amount, Direction, Type, Description, BalanceAfter, RelatedAuctionId, RelatedPlayerId, CreatedAt)
VALUES (@Uid, @Amt, 'CREDIT', 'FINAL_BID_REFUND', @Desc, (SELECT AvailableBalance FROM tbs_auction_user_wallet WHERE UserId = @Uid), @Aid, @Pid, GETUTCDATE())
"@
                $execCmd.Parameters.AddWithValue("@Uid", $userId) | Out-Null
                $execCmd.Parameters.AddWithValue("@Amt", $amount) | Out-Null
                $execCmd.Parameters.AddWithValue("@Desc", $desc) | Out-Null
                $execCmd.Parameters.AddWithValue("@Aid", $aidParam) | Out-Null
                $execCmd.Parameters.AddWithValue("@Pid", $pidParam) | Out-Null
                $execCmd.ExecuteNonQuery() | Out-Null
                
            } else {
                # Negative leak: Double refunded
                # Action: Debit AvailableBalance (-abs(netReserved)), Credit ReservedBalance (+abs(netReserved))
                $amount = [Math]::Abs($netReserved)
                $desc = "[Recovery] Adjusting double refund on $playerName (Auction $auctionId)"
                
                Write-Host "Fixing User: $username (ID: $userId) | negative leak on $playerName | Debiting $amount TP" -ForegroundColor Red
                
                # Update Wallet
                $execCmd.CommandText = "UPDATE tbs_auction_user_wallet SET AvailableBalance = AvailableBalance - @Amt, ReservedBalance = ReservedBalance + @Amt WHERE UserId = @Uid"
                $execCmd.Parameters.AddWithValue("@Amt", $amount) | Out-Null
                $execCmd.Parameters.AddWithValue("@Uid", $userId) | Out-Null
                $execCmd.ExecuteNonQuery() | Out-Null
                $execCmd.Parameters.Clear()
                
                # Record Transaction
                $execCmd.CommandText = @"
INSERT INTO tbs_auction_transactions (UserId, Amount, Direction, Type, Description, BalanceAfter, RelatedAuctionId, RelatedPlayerId, CreatedAt)
VALUES (@Uid, @Amt, 'DEBIT', 'ADJUSTMENT', @Desc, (SELECT AvailableBalance FROM tbs_auction_user_wallet WHERE UserId = @Uid), @Aid, @Pid, GETUTCDATE())
"@
                $execCmd.Parameters.AddWithValue("@Uid", $userId) | Out-Null
                $execCmd.Parameters.AddWithValue("@Amt", $amount) | Out-Null
                $execCmd.Parameters.AddWithValue("@Desc", $desc) | Out-Null
                $execCmd.Parameters.AddWithValue("@Aid", $aidParam) | Out-Null
                $execCmd.Parameters.AddWithValue("@Pid", $pidParam) | Out-Null
                $execCmd.ExecuteNonQuery() | Out-Null
            }
            
            $count++
        }
        
        # Commit transaction
        $transaction.Commit()
        Write-Host "`nSUCCESS: Successfully adjusted wallets and recorded $count transaction entries!" -ForegroundColor Green
        
    } catch {
        # Rollback on error
        $transaction.Rollback()
        Write-Error "Transaction failed and has been rolled back! Message: $_"
    }
    
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
