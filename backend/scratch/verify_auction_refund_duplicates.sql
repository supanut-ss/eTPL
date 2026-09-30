/* Read-only. AUCTION_REFUND can legitimately repeat many times per (User, Auction)
   during a normal back-and-forth bidding war (each outbid = one refund of a
   DIFFERENT, increasing amount). That is NOT a bug. The actual race-condition bug
   looks like the FINAL_BID_REFUND case: the SAME amount refunded twice within
   milliseconds of each other. This checks specifically for that pattern. */

WITH dupes AS (
    SELECT
        t.UserId,
        t.RelatedAuctionId,
        t.Amount,
        t.transaction_id,
        t.CreatedAt,
        LAG(t.CreatedAt) OVER (PARTITION BY t.UserId, t.RelatedAuctionId, t.Amount ORDER BY t.CreatedAt) AS PrevCreatedAt,
        LAG(t.transaction_id) OVER (PARTITION BY t.UserId, t.RelatedAuctionId, t.Amount ORDER BY t.CreatedAt) AS PrevTxId
    FROM tbs_auction_transactions t
    WHERE t.Type = 'AUCTION_REFUND'
)
SELECT
    u.user_id AS Username,
    d.RelatedAuctionId,
    p.player_name,
    d.Amount,
    d.PrevTxId,
    d.PrevCreatedAt,
    d.transaction_id AS TxId,
    d.CreatedAt,
    DATEDIFF(MILLISECOND, d.PrevCreatedAt, d.CreatedAt) AS GapMs
FROM dupes d
JOIN tbm_user u ON u.id = d.UserId
LEFT JOIN tbs_auction_board ab ON ab.auction_id = d.RelatedAuctionId
LEFT JOIN pes_player_team p ON p.id_player = ab.PlayerId
WHERE d.PrevCreatedAt IS NOT NULL
  AND DATEDIFF(MILLISECOND, d.PrevCreatedAt, d.CreatedAt) < 5000  -- same amount, within 5 seconds = suspicious
ORDER BY GapMs;
