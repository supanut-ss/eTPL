$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;MultipleActiveResultSets=True;TrustServerCertificate=True;Connect Timeout=15;"

try {
    [void][System.Reflection.Assembly]::LoadWithPartialName("System.Data")
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()

    $transaction = $conn.BeginTransaction()

    # Duplicate Tx IDs to remove: 7653 and 7655
    $txIds = @(7653, 7655)
    
    foreach ($txId in $txIds) {
        $cmdGet = $conn.CreateCommand()
        $cmdGet.Transaction = $transaction
        $cmdGet.CommandText = "SELECT UserId, Amount, Description FROM tbs_auction_transactions WHERE transaction_id = @TxId"
        $cmdGet.Parameters.AddWithValue("@TxId", $txId) | Out-Null
        
        $reader = $cmdGet.ExecuteReader()
        if ($reader.Read()) {
            $userId = $reader["UserId"]
            $amount = $reader["Amount"]
            $desc = $reader["Description"]
            $reader.Close()
            
            # Fetch current balance
            $cmdBal = $conn.CreateCommand()
            $cmdBal.Transaction = $transaction
            $cmdBal.CommandText = "SELECT AvailableBalance FROM tbs_auction_user_wallet WHERE UserId = @UserId"
            $cmdBal.Parameters.AddWithValue("@UserId", $userId) | Out-Null
            $currentBal = $cmdBal.ExecuteScalar()
            
            Write-Host "TxID: $txId | UserID: $userId | Current Wallet Balance: $currentBal TP | Deducting: $amount TP"
            
            # Deduct wallet balance
            $cmdUpdate = $conn.CreateCommand()
            $cmdUpdate.Transaction = $transaction
            $cmdUpdate.CommandText = "UPDATE tbs_auction_user_wallet SET AvailableBalance = AvailableBalance - @Amount WHERE UserId = @UserId"
            $cmdUpdate.Parameters.AddWithValue("@Amount", $amount) | Out-Null
            $cmdUpdate.Parameters.AddWithValue("@UserId", $userId) | Out-Null
            $rowsWallet = $cmdUpdate.ExecuteNonQuery()
            
            # Delete the duplicate transaction record
            $cmdDelete = $conn.CreateCommand()
            $cmdDelete.Transaction = $transaction
            $cmdDelete.CommandText = "DELETE FROM tbs_auction_transactions WHERE transaction_id = @TxId"
            $cmdDelete.Parameters.AddWithValue("@TxId", $txId) | Out-Null
            $rowsTx = $cmdDelete.ExecuteNonQuery()
            
            # Get updated balance
            $cmdBalNew = $conn.CreateCommand()
            $cmdBalNew.Transaction = $transaction
            $cmdBalNew.CommandText = "SELECT AvailableBalance FROM tbs_auction_user_wallet WHERE UserId = @UserId"
            $cmdBalNew.Parameters.AddWithValue("@UserId", $userId) | Out-Null
            $newBal = $cmdBalNew.ExecuteScalar()
            
            Write-Host "  -> Result: Updated Wallet Balance to $newBal TP. Deleted Transaction Record: $rowsTx row(s)."
        } else {
            $reader.Close()
            Write-Warning "Transaction ID $txId not found or already processed."
        }
    }

    $transaction.Commit()
    Write-Host "Transaction successfully committed!"

    $conn.Close()
} catch {
    if ($null -ne $transaction) {
        try { $transaction.Rollback() } catch {}
        Write-Error "Error occurred. Transaction has been rolled back."
    }
    Write-Error $_
}
