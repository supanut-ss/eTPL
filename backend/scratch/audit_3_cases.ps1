$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
SELECT 
    t.transaction_id,
    t.UserId,
    u.user_id AS ManagerName,
    t.RelatedPlayerId,
    p.player_name AS PlayerName,
    t.Type,
    t.Direction,
    t.Amount,
    t.BalanceAfter,
    t.Description,
    t.CreatedAt
FROM tbs_auction_transactions t
JOIN tbm_user u ON u.id = t.UserId
LEFT JOIN pes_player_team p ON p.id_player = t.RelatedPlayerId
WHERE (t.UserId = 12 AND t.RelatedPlayerId = 186358)
   OR (t.UserId = 22 AND t.RelatedPlayerId = 175654)
   OR (t.UserId = 30 AND t.RelatedPlayerId = 179782)
ORDER BY t.UserId, t.CreatedAt ASC
"@
    $dt = New-Object System.Data.DataTable
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $adapter.Fill($dt) | Out-Null
    
    foreach ($row in $dt.Rows) {
        Write-Output ("[{0}] User: {1} | Player: {2} | Type: {3} | Amt: {4} | Date: {5}" -f $row["transaction_id"], $row["ManagerName"], $row["PlayerName"], $row["Type"], $row["Amount"], $row["CreatedAt"])
        Write-Output ("      Note: {0}" -f $row["Description"])
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
