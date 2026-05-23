param([switch]$Execute)

Add-Type -AssemblyName "System.Data"

$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"

$drySql = "
SELECT 
    ab.AuctionId,
    pp.PlayerName,
    ab.CurrentPrice AS CurrentPriceAtSold,
    ab.HighestBidderId AS NormalWinnerId,
    winner_bid.UserId AS FinalWinnerId,
    loser_bid.UserId AS LoserId,
    loser_bid.BidAmount AS LoserFinalBidAmount,
    CASE 
        WHEN ab.HighestBidderId = loser_bid.UserId 
        THEN loser_bid.BidAmount - ab.CurrentPrice
        ELSE loser_bid.BidAmount
    END AS RefundAmount
FROM AuctionBoards ab
JOIN PesPlayerTeams pp ON pp.IdPlayer = ab.PlayerId
JOIN (
    SELECT AuctionId, UserId FROM (
        SELECT AuctionId, UserId,
               ROW_NUMBER() OVER (PARTITION BY AuctionId ORDER BY BidAmount DESC, CreatedAt ASC) AS rn
        FROM AuctionBidLogs WHERE Phase = 'Final'
    ) ranked WHERE rn = 1
) winner_bid ON winner_bid.AuctionId = ab.AuctionId
JOIN AuctionBidLogs loser_bid 
    ON loser_bid.AuctionId = ab.AuctionId 
    AND loser_bid.Phase = 'Final'
    AND loser_bid.UserId != winner_bid.UserId
WHERE ab.DbStatus = 'Sold'
AND NOT EXISTS (
    SELECT 1 FROM AuctionTransactions t 
    WHERE t.UserId = loser_bid.UserId 
    AND t.RelatedAuctionId = ab.AuctionId 
    AND t.Type = 'FINAL_BID_REFUND'
)
ORDER BY ab.AuctionId, loser_bid.UserId
"

$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    
    # --- DRY RUN ---
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $drySql
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    $adapter.Fill($dt) | Out-Null

    if ($dt.Rows.Count -eq 0) {
        Write-Host "PASS: ไม่มีเงินค้างอยู่เลย ทุกคนได้รับเงินคืนครบถ้วนแล้ว" -ForegroundColor Green
        return
    }

    Write-Host "=== DRY RUN: รายการที่ต้องคืนเงิน ===" -ForegroundColor Yellow
    foreach ($row in $dt.Rows) {
        Write-Host ("  AuctionId={0} | Player={1} | LoserId={2} | FinalBid={3} | Refund={4} TP" -f `
            $row["AuctionId"], $row["PlayerName"], $row["LoserId"], $row["LoserFinalBidAmount"], $row["RefundAmount"]) -ForegroundColor Cyan
    }
    $totalTP = ($dt.Rows | ForEach-Object { [int]$_["RefundAmount"] } | Measure-Object -Sum).Sum
    Write-Host ("รวม: {0} รายการ | ยอดรวม: {1} TP" -f $dt.Rows.Count, $totalTP) -ForegroundColor Cyan

    if (-not $Execute) {
        Write-Host ""
        Write-Host ">> เรียกด้วย -Execute เพื่อดำเนินการจริง" -ForegroundColor Yellow
        return
    }

    # --- EXECUTE ---
    Write-Host ""
    Write-Host "=== กำลังคืนเงิน... ===" -ForegroundColor Red

    $execCmd = $conn.CreateCommand()
    $execCmd.CommandTimeout = 60
    $execCmd.CommandText = "
BEGIN TRANSACTION;

-- 1. Update wallets
UPDATE w
SET 
    w.AvailableBalance = w.AvailableBalance + r.RefundAmount,
    w.ReservedBalance  = w.ReservedBalance  - r.RefundAmount
FROM AuctionUserWallets w
JOIN (
    SELECT loser_bid.UserId,
        CASE WHEN ab.HighestBidderId = loser_bid.UserId 
             THEN loser_bid.BidAmount - ab.CurrentPrice
             ELSE loser_bid.BidAmount
        END AS RefundAmount
    FROM AuctionBoards ab
    JOIN (
        SELECT AuctionId, UserId FROM (
            SELECT AuctionId, UserId,
                   ROW_NUMBER() OVER (PARTITION BY AuctionId ORDER BY BidAmount DESC, CreatedAt ASC) AS rn
            FROM AuctionBidLogs WHERE Phase = 'Final'
        ) ranked WHERE rn = 1
    ) winner_bid ON winner_bid.AuctionId = ab.AuctionId
    JOIN AuctionBidLogs loser_bid ON loser_bid.AuctionId = ab.AuctionId 
        AND loser_bid.Phase = 'Final' AND loser_bid.UserId != winner_bid.UserId
    WHERE ab.DbStatus = 'Sold'
    AND NOT EXISTS (
        SELECT 1 FROM AuctionTransactions t 
        WHERE t.UserId = loser_bid.UserId AND t.RelatedAuctionId = ab.AuctionId AND t.Type = 'FINAL_BID_REFUND'
    )
) r ON r.UserId = w.UserId;

DECLARE @walletsUpdated INT = @@ROWCOUNT;

-- 2. Insert transaction records
INSERT INTO AuctionTransactions (UserId, Amount, Direction, Type, Description, BalanceAfter, RelatedAuctionId, RelatedPlayerId, CreatedAt)
SELECT 
    loser_bid.UserId,
    CASE WHEN ab.HighestBidderId = loser_bid.UserId 
         THEN loser_bid.BidAmount - ab.CurrentPrice
         ELSE loser_bid.BidAmount
    END,
    'CREDIT',
    'FINAL_BID_REFUND',
    CONCAT('[Recovery] คืนเงินประมูลไม่ชนะรอบ Final ', pp.PlayerName),
    ISNULL((SELECT AvailableBalance FROM AuctionUserWallets WHERE UserId = loser_bid.UserId), 0),
    ab.AuctionId,
    ab.PlayerId,
    GETUTCDATE()
FROM AuctionBoards ab
JOIN PesPlayerTeams pp ON pp.IdPlayer = ab.PlayerId
JOIN (
    SELECT AuctionId, UserId FROM (
        SELECT AuctionId, UserId,
               ROW_NUMBER() OVER (PARTITION BY AuctionId ORDER BY BidAmount DESC, CreatedAt ASC) AS rn
        FROM AuctionBidLogs WHERE Phase = 'Final'
    ) ranked WHERE rn = 1
) winner_bid ON winner_bid.AuctionId = ab.AuctionId
JOIN AuctionBidLogs loser_bid ON loser_bid.AuctionId = ab.AuctionId 
    AND loser_bid.Phase = 'Final' AND loser_bid.UserId != winner_bid.UserId
WHERE ab.DbStatus = 'Sold'
AND NOT EXISTS (
    SELECT 1 FROM AuctionTransactions t 
    WHERE t.UserId = loser_bid.UserId AND t.RelatedAuctionId = ab.AuctionId AND t.Type = 'FINAL_BID_REFUND'
);

DECLARE @txInserted INT = @@ROWCOUNT;

COMMIT;

SELECT @walletsUpdated AS WalletsUpdated, @txInserted AS TxInserted;
"
    $reader = $execCmd.ExecuteReader()
    if ($reader.Read()) {
        $wallets = $reader["WalletsUpdated"]
        $txs = $reader["TxInserted"]
        Write-Host ("PASS: คืนเงินสำเร็จ! Wallets updated: {0} | Transactions inserted: {1}" -f $wallets, $txs) -ForegroundColor Green
    }
    $reader.Close()

} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
