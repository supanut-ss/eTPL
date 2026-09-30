/* Read-only. Find every (UserId, RelatedAuctionId) pair that has MORE THAN ONE
   FINAL_BID_REFUND transaction - this is the race-condition bug where two
   code paths (the expired-auction sweep and ExecuteConfirmAuctionInternalAsync)
   both refunded the same losing final bid. */

SELECT
    u.user_id AS Username,
    t.RelatedAuctionId,
    p.player_name,
    COUNT(*) AS RefundCount,
    SUM(t.Amount) AS TotalRefunded,
    MIN(t.Amount) AS ExpectedRefundAmount,  -- assuming all duplicates refunded the same amount
    SUM(t.Amount) - MIN(t.Amount) AS ExcessAmount,  -- how much extra they got (and likely already spent)
    MIN(t.CreatedAt) AS FirstRefundAt,
    MAX(t.CreatedAt) AS LastRefundAt,
    DATEDIFF(MILLISECOND, MIN(t.CreatedAt), MAX(t.CreatedAt)) AS SpanMs
FROM tbs_auction_transactions t
JOIN tbm_user u ON u.id = t.UserId
LEFT JOIN tbs_auction_board ab ON ab.auction_id = t.RelatedAuctionId
LEFT JOIN pes_player_team p ON p.id_player = ab.PlayerId
WHERE t.Type = 'FINAL_BID_REFUND'
GROUP BY u.user_id, t.RelatedAuctionId, p.player_name
HAVING COUNT(*) > 1
ORDER BY ExcessAmount DESC;

-- Per-user total excess (in case one user has this happen on multiple auctions)
SELECT
    u.user_id AS Username,
    SUM(x.ExcessAmount) AS TotalExcessAcrossAuctions,
    w.AvailableBalance,
    w.ReservedBalance
FROM (
    SELECT
        t.UserId,
        t.RelatedAuctionId,
        SUM(t.Amount) - MIN(t.Amount) AS ExcessAmount
    FROM tbs_auction_transactions t
    WHERE t.Type = 'FINAL_BID_REFUND'
    GROUP BY t.UserId, t.RelatedAuctionId
    HAVING COUNT(*) > 1
) x
JOIN tbm_user u ON u.id = x.UserId
LEFT JOIN tbs_auction_user_wallet w ON w.UserId = x.UserId
GROUP BY u.user_id, w.AvailableBalance, w.ReservedBalance
ORDER BY TotalExcessAcrossAuctions DESC;


-- Sanity check: also look for the SAME pattern on other refund/credit types that
-- have similar "already processed?" guards (AUCTION_REFUND, FINAL_BID_REFUND handled
-- above; check AUCTION_REFUND separately since it's used by a different code path too)
SELECT
    u.user_id AS Username,
    t.Type,
    t.RelatedAuctionId,
    COUNT(*) AS Cnt,
    SUM(t.Amount) AS TotalAmount
FROM tbs_auction_transactions t
JOIN tbm_user u ON u.id = t.UserId
WHERE t.Type IN ('AUCTION_REFUND')
  AND t.RelatedAuctionId IS NOT NULL
GROUP BY u.user_id, t.Type, t.RelatedAuctionId
HAVING COUNT(*) > 1
ORDER BY Cnt DESC;
