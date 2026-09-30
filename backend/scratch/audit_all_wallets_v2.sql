/* =========================================================================
   PURPOSE
   Full financial audit, read-only. For every user, checks:
   1) ReservedBalance vs what SHOULD be reserved right now (sum of CurrentPrice
      for active auctions where they're the highest Normal-phase bidder, with
      Final-phase bids overriding that amount - same logic as audit_wallets.ps1).
   2) AvailableBalance vs the BalanceAfter of their own most recent transaction
      (sanity check - these should always match; a mismatch means something
      touched AvailableBalance without logging a transaction).
   3) Flags any NEGATIVE ReservedBalance outright (impossible in a healthy
      system - always a bug symptom).
   ========================================================================= */

WITH normal_reserved AS (
    SELECT ab.HighestBidderId AS UserId, SUM(ab.CurrentPrice) AS Amt
    FROM tbs_auction_board ab
    WHERE ab.DbStatus = 'Active' AND ab.HighestBidderId IS NOT NULL
    GROUP BY ab.HighestBidderId
),
final_bids AS (
    SELECT fb.UserId, fb.AuctionId, MAX(fb.BidAmount) AS BidAmount
    FROM tbs_auction_bid_log fb
    JOIN tbs_auction_board ab ON ab.auction_id = fb.AuctionId
    WHERE fb.Phase = 'Final' AND ab.DbStatus = 'Active'
    GROUP BY fb.UserId, fb.AuctionId
),
final_reserved AS (
    SELECT fb.UserId, SUM(fb.BidAmount) AS Amt
    FROM final_bids fb
    GROUP BY fb.UserId
),
final_override_subtract AS (
    -- for users who have a Final bid AND were also the Normal-phase highest bidder on
    -- that SAME auction, their Normal-phase reservation for that auction gets replaced
    -- by the Final bid amount, not added on top of it
    SELECT fb.UserId, SUM(ab.CurrentPrice) AS Amt
    FROM final_bids fb
    JOIN tbs_auction_board ab ON ab.auction_id = fb.AuctionId AND ab.HighestBidderId = fb.UserId
    GROUP BY fb.UserId
),
expected_reserved AS (
    SELECT
        u.id AS UserId,
        ISNULL(nr.Amt, 0) + ISNULL(fr.Amt, 0) - ISNULL(fos.Amt, 0) AS ExpectedReserved
    FROM tbm_user u
    LEFT JOIN normal_reserved nr ON nr.UserId = u.id
    LEFT JOIN final_reserved fr ON fr.UserId = u.id
    LEFT JOIN final_override_subtract fos ON fos.UserId = u.id
),
last_tx AS (
    SELECT t.UserId, t.BalanceAfter,
        ROW_NUMBER() OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt DESC, t.transaction_id DESC) AS rn
    FROM tbs_auction_transactions t
)
SELECT
    u.user_id AS Username,
    w.AvailableBalance,
    w.ReservedBalance,
    er.ExpectedReserved,
    w.ReservedBalance - er.ExpectedReserved AS ReservedDiff,
    lt.BalanceAfter AS LastTxBalanceAfter,
    w.AvailableBalance - lt.BalanceAfter AS AvailableVsLastTxDiff,
    CASE WHEN w.ReservedBalance < 0 THEN 'NEGATIVE RESERVED!' ELSE '' END AS Flag
FROM tbm_user u
JOIN tbs_auction_user_wallet w ON w.UserId = u.id
LEFT JOIN expected_reserved er ON er.UserId = u.id
LEFT JOIN last_tx lt ON lt.UserId = u.id AND lt.rn = 1
WHERE w.ReservedBalance < 0                                    -- always a bug
   OR w.ReservedBalance <> ISNULL(er.ExpectedReserved, 0)       -- reserved mismatch
   OR (lt.BalanceAfter IS NOT NULL AND w.AvailableBalance <> lt.BalanceAfter)  -- available mismatch
ORDER BY
    CASE WHEN w.ReservedBalance < 0 THEN 0 ELSE 1 END,
    ABS(w.ReservedBalance - ISNULL(er.ExpectedReserved, 0)) DESC;
