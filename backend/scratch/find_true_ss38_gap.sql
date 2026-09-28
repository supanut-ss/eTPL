/* =========================================================================
   PURPOSE
   The previous "last tx of 27th vs first tx of 28th" check gets tainted for
   any user whose last transaction on the 27th happens to be a SPECIAL_BONUS
   row - those rows have BalanceAfter = 0 (a real bug in BonusController.cs:
   ApproveBonus/ApproveAll never set BalanceAfter), even though the actual
   wallet.AvailableBalance was updated correctly at the time.

   This script avoids trusting any BalanceAfter value except the very first
   transaction per user (used only as a starting anchor). Everything else is
   recomputed purely from Amount/Direction/Type, which ARE correct even for
   the buggy SPECIAL_BONUS rows. The result is compared against the user's
   CURRENT real wallet.AvailableBalance, so the only remaining explanation
   for a mismatch should be the season-transition SS38 revert-without-recharge
   bug (or anything else not yet identified - review before fixing).
   ========================================================================= */

WITH tx AS (
    SELECT
        t.transaction_id,
        t.UserId,
        t.Amount,
        t.Direction,
        t.Type,
        t.BalanceAfter,
        t.CreatedAt,
        CASE
            WHEN t.Type = 'AUCTION_WIN' THEN 0
            WHEN t.Direction = 'DEBIT' THEN -t.Amount
            WHEN t.Direction = 'CREDIT' THEN t.Amount
            ELSE 0
        END AS Delta,
        ROW_NUMBER() OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS rn
    FROM tbs_auction_transactions t
),
first_tx AS (
    SELECT UserId, BalanceAfter AS FirstBalanceAfter, Delta AS FirstDelta
    FROM tx WHERE rn = 1
),
sum_rest AS (
    SELECT UserId, SUM(Delta) AS SumDeltaAfterFirst
    FROM tx WHERE rn > 1
    GROUP BY UserId
)
SELECT
    u.user_id AS Username,
    f.UserId,
    f.FirstBalanceAfter,
    ISNULL(s.SumDeltaAfterFirst, 0) AS SumDeltaAfterFirst,
    (f.FirstBalanceAfter + ISNULL(s.SumDeltaAfterFirst, 0)) AS TrueExpectedBalance,
    w.AvailableBalance AS CurrentActualBalance,
    w.AvailableBalance - (f.FirstBalanceAfter + ISNULL(s.SumDeltaAfterFirst, 0)) AS Gap
FROM first_tx f
JOIN tbm_user u ON u.id = f.UserId
JOIN tbs_auction_user_wallet w ON w.UserId = f.UserId
LEFT JOIN sum_rest s ON s.UserId = f.UserId
WHERE w.AvailableBalance <> (f.FirstBalanceAfter + ISNULL(s.SumDeltaAfterFirst, 0))
ORDER BY Username;
