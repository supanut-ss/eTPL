/* Read-only. Show both rows of each confirmed duplicate FINAL_BID_REFUND
   (same User+Auction+Amount, within 5 seconds of each other) side by side,
   for the 6 confirmed-affected users. */

WITH dupes AS (
    SELECT
        t.UserId,
        t.RelatedAuctionId,
        t.Amount,
        t.transaction_id,
        t.CreatedAt,
        t.Description,
        LAG(t.CreatedAt) OVER (PARTITION BY t.UserId, t.RelatedAuctionId, t.Amount ORDER BY t.CreatedAt) AS PrevCreatedAt,
        LAG(t.transaction_id) OVER (PARTITION BY t.UserId, t.RelatedAuctionId, t.Amount ORDER BY t.CreatedAt) AS PrevTxId
    FROM tbs_auction_transactions t
    WHERE t.Type = 'FINAL_BID_REFUND'
)
SELECT
    u.user_id AS Username,
    p.player_name,
    d.RelatedAuctionId,
    d.Amount,
    d.PrevTxId AS FirstTxId,
    d.PrevCreatedAt AS FirstRefundAt,
    d.transaction_id AS DuplicateTxId,
    d.CreatedAt AS DuplicateRefundAt,
    DATEDIFF(MILLISECOND, d.PrevCreatedAt, d.CreatedAt) AS GapMs,
    d.Description
FROM dupes d
JOIN tbm_user u ON u.id = d.UserId
LEFT JOIN tbs_auction_board ab ON ab.auction_id = d.RelatedAuctionId
LEFT JOIN pes_player_team p ON p.id_player = ab.PlayerId
WHERE d.PrevCreatedAt IS NOT NULL
  AND DATEDIFF(MILLISECOND, d.PrevCreatedAt, d.CreatedAt) < 5000
ORDER BY Username, d.RelatedAuctionId;
