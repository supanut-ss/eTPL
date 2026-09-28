/* =========================================================================
   PURPOSE
   Same check as fix_ss38_balance_gap.sql (last tx of 27th vs first tx of
   28th), but patched for the one known logging bug: SPECIAL_BONUS rows
   always have BalanceAfter = 0 (BonusController.cs never sets it), even
   though wallet.AvailableBalance itself was updated correctly at the time.

   For any user whose last transaction on the 27th is SPECIAL_BONUS, this
   walks back to the most recent NON-SPECIAL_BONUS transaction (its
   BalanceAfter is trustworthy) and adds back the Amount/Direction of every
   SPECIAL_BONUS transaction since then, to reconstruct the true balance at
   end of day - without summing the user's entire history (which pulls in
   unrelated noise from other transaction types).
   ========================================================================= */

DECLARE @BoundaryDate DATE = '2026-09-28';

WITH day27 AS (
    SELECT t.*,
        ROW_NUMBER() OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt DESC, t.transaction_id DESC) AS rn_desc
    FROM tbs_auction_transactions t
    WHERE t.CreatedAt < @BoundaryDate
),
reliable_anchor AS (
    -- most recent non-SPECIAL_BONUS transaction per user, up to end of 27th
    SELECT t.*,
        ROW_NUMBER() OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt DESC, t.transaction_id DESC) AS rn
    FROM tbs_auction_transactions t
    WHERE t.CreatedAt < @BoundaryDate AND t.Type <> 'SPECIAL_BONUS'
),
anchor_only AS (
    SELECT UserId, transaction_id AS AnchorTxId, BalanceAfter AS AnchorBalanceAfter, CreatedAt AS AnchorCreatedAt
    FROM reliable_anchor WHERE rn = 1
),
catchup AS (
    -- sum of deltas for every transaction strictly after the anchor, up to end of 27th
    SELECT
        d.UserId,
        SUM(CASE
            WHEN d.Type = 'AUCTION_WIN' THEN 0
            WHEN d.Direction = 'DEBIT' THEN -d.Amount
            WHEN d.Direction = 'CREDIT' THEN d.Amount
            ELSE 0
        END) AS CatchupDelta
    FROM day27 d
    JOIN anchor_only a ON a.UserId = d.UserId
    WHERE d.CreatedAt > a.AnchorCreatedAt
       OR (d.CreatedAt = a.AnchorCreatedAt AND d.transaction_id > a.AnchorTxId)
    GROUP BY d.UserId
),
true_last_27 AS (
    SELECT
        a.UserId,
        a.AnchorBalanceAfter + ISNULL(c.CatchupDelta, 0) AS TrueLastBalanceAfter_27th
    FROM anchor_only a
    LEFT JOIN catchup c ON c.UserId = a.UserId
),
first_on_28 AS (
    SELECT t.*,
        ROW_NUMBER() OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS rn
    FROM tbs_auction_transactions t
    WHERE t.CreatedAt >= @BoundaryDate
)
SELECT
    u.user_id AS Username,
    f28.UserId,
    tl.TrueLastBalanceAfter_27th,
    f28.transaction_id AS FirstTxId_28th,
    f28.Type AS FirstType_28th,
    f28.Direction AS FirstDirection_28th,
    f28.Amount AS FirstAmount_28th,
    f28.BalanceAfter AS FirstBalanceAfter_28th,
    CASE
        WHEN f28.Type = 'AUCTION_WIN' THEN tl.TrueLastBalanceAfter_27th
        WHEN f28.Direction = 'DEBIT' THEN tl.TrueLastBalanceAfter_27th - f28.Amount
        WHEN f28.Direction = 'CREDIT' THEN tl.TrueLastBalanceAfter_27th + f28.Amount
        ELSE tl.TrueLastBalanceAfter_27th
    END AS ExpectedBalanceAfter_28th,
    f28.BalanceAfter - (CASE
        WHEN f28.Type = 'AUCTION_WIN' THEN tl.TrueLastBalanceAfter_27th
        WHEN f28.Direction = 'DEBIT' THEN tl.TrueLastBalanceAfter_27th - f28.Amount
        WHEN f28.Direction = 'CREDIT' THEN tl.TrueLastBalanceAfter_27th + f28.Amount
        ELSE tl.TrueLastBalanceAfter_27th
    END) AS Gap
FROM first_on_28 f28
JOIN true_last_27 tl ON tl.UserId = f28.UserId
JOIN tbm_user u ON u.id = f28.UserId
WHERE f28.rn = 1
  AND f28.BalanceAfter <> (CASE
        WHEN f28.Type = 'AUCTION_WIN' THEN tl.TrueLastBalanceAfter_27th
        WHEN f28.Direction = 'DEBIT' THEN tl.TrueLastBalanceAfter_27th - f28.Amount
        WHEN f28.Direction = 'CREDIT' THEN tl.TrueLastBalanceAfter_27th + f28.Amount
        ELSE tl.TrueLastBalanceAfter_27th
    END)
ORDER BY Username;
