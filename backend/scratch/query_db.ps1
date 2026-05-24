$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    # Fetch all users, their wallet reserved balances, and calculate their active bids
    $cmd.CommandText = @"
SELECT 
    u.id,
    u.user_id AS Username,
    u.current_team AS Team,
    ISNULL(w.ReservedBalance, 0) AS WalletReserved,
    ISNULL((
        -- Normal bids
        SELECT SUM(ab.CurrentPrice) 
        FROM tbs_auction_board ab 
        WHERE ab.DbStatus = 'Active' AND ab.HighestBidderId = u.id
    ), 0) +
    ISNULL((
        -- Final bids override/addition
        SELECT SUM(fb.BidAmount) 
        FROM tbs_auction_bid_log fb 
        JOIN tbs_auction_board ab2 ON ab2.auction_id = fb.AuctionId
        WHERE ab2.DbStatus = 'Active' AND fb.Phase = 'Final' AND fb.UserId = u.id
    ), 0) -
    ISNULL((
        -- Subtract normal bids that were overridden by final bids
        SELECT SUM(ab3.CurrentPrice)
        FROM tbs_auction_board ab3
        JOIN tbs_auction_bid_log fb2 ON fb2.AuctionId = ab3.auction_id
        WHERE ab3.DbStatus = 'Active' AND ab3.HighestBidderId = u.id AND fb2.UserId = u.id AND fb2.Phase = 'Final'
    ), 0) AS CalculatedActiveBids
FROM tbm_user u
LEFT JOIN tbs_auction_user_wallet w ON w.UserId = u.id
ORDER BY Username ASC
"@
    $dt = New-Object System.Data.DataTable
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $adapter.Fill($dt) | Out-Null
    
    Write-Output "=========================================================================="
    Write-Output "               RESERVED BALANCE VERIFICATION (ALL USERS)                 "
    Write-Output "=========================================================================="
    Write-Output ("{0,-15} | {1,-15} | {2,-15} | {3,-15} | {4,-10}" -f "Username", "Wallet Reserved", "Calculated Bids", "Difference", "Status")
    Write-Output ("-" * 74)
    
    foreach ($row in $dt.Rows) {
        $username = $row["Username"]
        $walletRes = [int]$row["WalletReserved"]
        $calcBids = [int]$row["CalculatedActiveBids"]
        $diff = $walletRes - $calcBids
        $status = if ($diff -eq 0) { "MATCH" } else { "MISMATCH" }
        Write-Output ("{0,-15} | {1,15:N0} | {2,15:N0} | {3,15:N0} | {4,-10}" -f $username, $walletRes, $calcBids, $diff, $status)
    }
    Write-Output ("-" * 74)



} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
