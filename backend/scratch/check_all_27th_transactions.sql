/* =========================================================================
   PURPOSE
   Before trusting "last transaction on 27th" as the anchor balance for the
   SS38 fix, verify the WHOLE day of 2026-09-27 is internally consistent
   per user. Some bonuses may have been added directly (e.g. SPECIAL_BONUS/
   CYCLE_BONUS/BONUS) without anyone checking that BalanceAfter continuity
   held afterward - if so, the "last balance of 27th" we anchored on could
   already be wrong before the SS38 bug ever ran.

   This lists every transaction on 2026-09-27 per user in order, with the
   expected running balance and a Gap column, so any break can be spotted
   by eye (AUCTION_WIN excluded from the balance math, same as before).
   ========================================================================= */

WITH day_tx AS (
    SELECT
        t.transaction_id,
        t.UserId,
        t.Amount,
        t.Direction,
        t.Type,
        t.Description,
        t.BalanceAfter,
        t.CreatedAt,
        ROW_NUMBER() OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS rn
    FROM tbs_auction_transactions t
    WHERE t.CreatedAt >= '2026-09-27' AND t.CreatedAt < '2026-09-28'
),
with_prev AS (
    SELECT
        d.*,
        LAG(d.BalanceAfter) OVER (PARTITION BY d.UserId ORDER BY d.rn) AS PrevBalanceAfter
    FROM day_tx d
)
SELECT
    u.user_id AS Username,
    w.UserId,
    w.transaction_id,
    w.Type,
    w.Direction,
    w.Amount,
    w.PrevBalanceAfter,
    w.BalanceAfter,
    CASE
        WHEN w.PrevBalanceAfter IS NULL THEN NULL
        WHEN w.Type = 'AUCTION_WIN' THEN w.PrevBalanceAfter
        WHEN w.Direction = 'DEBIT' THEN w.PrevBalanceAfter - w.Amount
        WHEN w.Direction = 'CREDIT' THEN w.PrevBalanceAfter + w.Amount
        ELSE w.PrevBalanceAfter
    END AS ExpectedBalanceAfter,
    CASE
        WHEN w.PrevBalanceAfter IS NULL THEN NULL
        ELSE w.BalanceAfter - (CASE
            WHEN w.Type = 'AUCTION_WIN' THEN w.PrevBalanceAfter
            WHEN w.Direction = 'DEBIT' THEN w.PrevBalanceAfter - w.Amount
            WHEN w.Direction = 'CREDIT' THEN w.PrevBalanceAfter + w.Amount
            ELSE w.PrevBalanceAfter
        END)
    END AS Gap,
    w.CreatedAt,
    w.Description
FROM with_prev w
JOIN tbm_user u ON u.id = w.UserId
ORDER BY Username, w.rn;
