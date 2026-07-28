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
    s.SeasonsWithTeam,
    s.AcquiredAt
FROM tbs_auction_squad s
JOIN tbm_user u ON u.id = s.UserId
LEFT JOIN pes_player_team p ON p.id_player = s.PlayerId
WHERE EXISTS (
    SELECT 1 FROM tbs_auction_transactions t1 
    JOIN tbs_auction_transactions t2 ON t1.UserId = t2.UserId AND t1.RelatedPlayerId = t2.RelatedPlayerId
    WHERE t1.UserId = s.UserId AND t1.RelatedPlayerId = s.PlayerId 
    AND t1.Type IN ('CONTRACT_RENEWAL', 'CONTRACT_RENEWAL_AUTO')
    AND t2.Type IN ('FREE_RELEASE', 'AUTO_RELEASE_EXPIRED')
    AND t1.CreatedAt < t2.CreatedAt
)
"@
    $dt = New-Object System.Data.DataTable
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $adapter.Fill($dt) | Out-Null
    
    Write-Output "=========================================================================================="
    Write-Output "    CHECK: MANAGERS WHO RENEWED BEFORE RELEASED -> RE-ACQUIRED                             "
    Write-Output "=========================================================================================="
    Write-Output ("Total cases found: {0}" -f $dt.Rows.Count)
    
    if ($dt.Rows.Count -eq 0) {
        Write-Output ""
        Write-Output ">>> RESULT: Zero (0) cases found where contract renewal occurred BEFORE release! <<<"
    } else {
        foreach ($row in $dt.Rows) {
            Write-Output ("Manager: {0} | Player: {1} | SeasonsWithTeam: {2} | AcquiredAt: {3}" -f $row["ManagerName"], $row["PlayerName"], $row["SeasonsWithTeam"], $row["AcquiredAt"])
        }
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
