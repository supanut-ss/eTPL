$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
SELECT 
    s.squad_id,
    s.UserId,
    u.user_id AS ManagerName,
    s.PlayerId,
    p.player_name AS PlayerName,
    p.player_ovr AS PlayerOvr,
    s.SeasonsWithTeam,
    s.Status AS SquadStatus,
    s.AcquiredAt,
    t.Type AS ReleaseType,
    t.CreatedAt AS ReleaseDate,
    t.Amount AS RefundAmount,
    t.Description AS ReleaseDescription
FROM tbs_auction_squad s
JOIN tbm_user u ON u.id = s.UserId
LEFT JOIN pes_player_team p ON p.id_player = s.PlayerId
JOIN tbs_auction_transactions t ON t.UserId = s.UserId 
    AND t.RelatedPlayerId = s.PlayerId 
    AND t.Type IN ('FREE_RELEASE', 'AUTO_RELEASE_EXPIRED')
ORDER BY t.CreatedAt DESC
"@
    $dt = New-Object System.Data.DataTable
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $adapter.Fill($dt) | Out-Null
    
    Write-Output "=========================================================================================="
    Write-Output "          AUDIT: PLAYERS RELEASED AND RE-ACQUIRED BY THE SAME MANAGER                     "
    Write-Output "=========================================================================================="
    Write-Output ("Total matching cases found in Database: {0}" -f $dt.Rows.Count)
    Write-Output ""

    foreach ($row in $dt.Rows) {
        $uid = $row["UserId"]
        $playerIdVar = $row["PlayerId"]
        Write-Output ("Manager: {0} (ID: {1}) | Player: {2} (ID: {3}) | OVR: {4} | Current SeasonsWithTeam: {5}" -f $row["ManagerName"], $uid, $row["PlayerName"], $playerIdVar, $row["PlayerOvr"], $row["SeasonsWithTeam"])
        Write-Output ("   - Released At: {0} ({1})" -f $row["ReleaseDate"], $row["ReleaseDescription"])
        Write-Output ("   - Re-acquired At: {0}" -f $row["AcquiredAt"])
        
        # Query transaction history for this manager & player
        $cmdTx = $conn.CreateCommand()
        $cmdTx.CommandText = "SELECT transaction_id, Type, Amount, Direction, Description, CreatedAt FROM tbs_auction_transactions WHERE UserId = $uid AND RelatedPlayerId = $playerIdVar ORDER BY CreatedAt ASC"
        $dtTx = New-Object System.Data.DataTable
        $adapterTx = New-Object System.Data.SqlClient.SqlDataAdapter($cmdTx)
        $adapterTx.Fill($dtTx) | Out-Null
        
        Write-Output "   - Transaction History:"
        foreach ($tx in $dtTx.Rows) {
            Write-Output ("       * [{0}] {1} | {2} {3} TP | {4} | {5}" -f $tx["transaction_id"], $tx["CreatedAt"], $tx["Direction"], $tx["Amount"], $tx["Type"], $tx["Description"])
        }
        Write-Output ("-" * 90)
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
