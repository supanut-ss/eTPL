$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
SELECT TOP 10
    ab.auction_id,
    ab.PlayerId,
    p.player_name,
    p.player_ovr,
    p.position,
    ab.CurrentPrice,
    ab.HighestBidderId,
    u_hb.line_name AS HighestBidderName,
    u_in.line_name AS InitiatorName,
    ab.NormalEndTime,
    ab.FinalEndTime,
    ab.DbStatus
FROM tbs_auction_board ab
LEFT JOIN pes_player_team p ON p.id_player = ab.PlayerId
LEFT JOIN tbm_user u_in ON u_in.id = ab.InitiatorUserId
LEFT JOIN tbm_user u_hb ON u_hb.id = ab.HighestBidderId
ORDER BY ab.auction_id DESC
"@
    $dt = New-Object System.Data.DataTable
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $adapter.Fill($dt) | Out-Null
    
    Write-Output "Joined Query Results (Top 10):"
    foreach ($row in $dt.Rows) {
        Write-Output ("AuctionId: {0} | Player: {1} | Initiator: {2} | Bidder: {3} | Price: {4} | Status: {5}" -f `
            $row["auction_id"], $row["player_name"], $row["InitiatorName"], $row["HighestBidderName"], $row["CurrentPrice"], $row["DbStatus"])
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
