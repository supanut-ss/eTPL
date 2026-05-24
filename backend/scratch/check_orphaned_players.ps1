$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    
    # 1. Check total auctions vs auctions with valid PlayerIds
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
SELECT 
    (SELECT COUNT(*) FROM tbs_auction_board) AS TotalAuctions,
    (SELECT COUNT(*) FROM tbs_auction_board ab WHERE ab.PlayerId NOT IN (SELECT id_player FROM pes_player_team)) AS OrphanedPlayerAuctions,
    (SELECT COUNT(*) FROM tbs_auction_board ab WHERE ab.InitiatorUserId NOT IN (SELECT id FROM tbm_user)) AS OrphanedInitiatorAuctions,
    (SELECT COUNT(*) FROM tbs_auction_board ab WHERE ab.HighestBidderId IS NOT NULL AND ab.HighestBidderId NOT IN (SELECT id FROM tbm_user)) AS OrphanedBidderAuctions
"@
    $r = $cmd.ExecuteReader()
    if ($r.Read()) {
        Write-Output "--- ORPHAN DATA AUDIT ---"
        Write-Output ("Total Auctions in board           : {0}" -f $r["TotalAuctions"])
        Write-Output ("Auctions with missing Player      : {0}" -f $r["OrphanedPlayerAuctions"])
        Write-Output ("Auctions with missing Initiator   : {0}" -f $r["OrphanedInitiatorAuctions"])
        Write-Output ("Auctions with missing Bidder      : {0}" -f $r["OrphanedBidderAuctions"])
    }
    $r.Close()
    
    # 2. Check counts under INNER JOIN (which EF Core is doing)
    $cmd.CommandText = @"
SELECT COUNT(*) AS InnerJoinCount
FROM tbs_auction_board ab
INNER JOIN pes_player_team p ON p.id_player = ab.PlayerId
INNER JOIN tbm_user u_in ON u_in.id = ab.InitiatorUserId
LEFT JOIN tbm_user u_hb ON u_hb.id = ab.HighestBidderId
"@
    $count = $cmd.ExecuteScalar()
    Write-Output ("Total matching rows under current EF Core query: {0}" -f $count)
    
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
