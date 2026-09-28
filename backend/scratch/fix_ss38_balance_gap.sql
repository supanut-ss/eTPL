/* =========================================================================
   PURPOSE
   The season-open bug reverted real SS38 CONTRACT_RENEWAL_AUTO charges
   (credited the money back, deleted the transaction) without re-charging
   an equivalent SS38 amount, then charged SS39 renewals fresh on top.
   The incident happened during the season transition run overnight
   between 2026-09-27 and 2026-09-28.

   This checks, per user, the TRUE final balance of 2026-09-27 (reconciled -
   see note below) against the FIRST transaction's BalanceAfter on
   2026-09-28, and reports the gap.

   "True final balance of the 27th" is NOT simply the last transaction's
   BalanceAfter, because SPECIAL_BONUS transactions have a separate, known
   logging bug (BonusController.cs never sets BalanceAfter, so it's always
   stored as 0) even though wallet.AvailableBalance itself was updated
   correctly at the time. So we walk back to the most recent NON-
   SPECIAL_BONUS transaction (its BalanceAfter is trustworthy) and add back
   the Amount/Direction of every SPECIAL_BONUS transaction since then, to
   reconstruct the true end-of-day balance - without summing the user's
   entire history (which would pull in unrelated noise from other,
   unrelated transaction types elsewhere).

   HOW TO USE
   1. Run STEP 1 (read-only). Should show one row per affected user.
   2. Run STEP 2 (wrapped in an explicit, uncommitted transaction).
      Review the preview output.
   3. COMMIT TRAN; if correct, or ROLLBACK TRAN; if not.
   ========================================================================= */

DECLARE @BoundaryDate DATE = '2026-09-28';


/* ---------------------------------------------------------------------
   STEP 1: READ-ONLY DIAGNOSTIC
   --------------------------------------------------------------------- */
WITH reliable_anchor AS (
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
    SELECT
        d.UserId,
        SUM(CASE
            WHEN d.Type = 'AUCTION_WIN' THEN 0
            WHEN d.Direction = 'DEBIT' THEN -d.Amount
            WHEN d.Direction = 'CREDIT' THEN d.Amount
            ELSE 0
        END) AS CatchupDelta
    FROM tbs_auction_transactions d
    JOIN anchor_only a ON a.UserId = d.UserId
    WHERE d.CreatedAt < @BoundaryDate
      AND (d.CreatedAt > a.AnchorCreatedAt OR (d.CreatedAt = a.AnchorCreatedAt AND d.transaction_id > a.AnchorTxId))
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


/* ---------------------------------------------------------------------
   STEP 2: APPLY FIX - only for positive gaps (money that appeared).
   Wrapped in an explicit transaction that is NOT committed automatically.
   --------------------------------------------------------------------- */
BEGIN TRAN;

DECLARE @BoundaryDate2 DATE = '2026-09-28';

WITH reliable_anchor AS (
    SELECT t.*,
        ROW_NUMBER() OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt DESC, t.transaction_id DESC) AS rn
    FROM tbs_auction_transactions t
    WHERE t.CreatedAt < @BoundaryDate2 AND t.Type <> 'SPECIAL_BONUS'
),
anchor_only AS (
    SELECT UserId, transaction_id AS AnchorTxId, BalanceAfter AS AnchorBalanceAfter, CreatedAt AS AnchorCreatedAt
    FROM reliable_anchor WHERE rn = 1
),
catchup AS (
    SELECT
        d.UserId,
        SUM(CASE
            WHEN d.Type = 'AUCTION_WIN' THEN 0
            WHEN d.Direction = 'DEBIT' THEN -d.Amount
            WHEN d.Direction = 'CREDIT' THEN d.Amount
            ELSE 0
        END) AS CatchupDelta
    FROM tbs_auction_transactions d
    JOIN anchor_only a ON a.UserId = d.UserId
    WHERE d.CreatedAt < @BoundaryDate2
      AND (d.CreatedAt > a.AnchorCreatedAt OR (d.CreatedAt = a.AnchorCreatedAt AND d.transaction_id > a.AnchorTxId))
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
    WHERE t.CreatedAt >= @BoundaryDate2
),
gaps AS (
    SELECT
        f28.UserId,
        f28.BalanceAfter - (CASE
            WHEN f28.Type = 'AUCTION_WIN' THEN tl.TrueLastBalanceAfter_27th
            WHEN f28.Direction = 'DEBIT' THEN tl.TrueLastBalanceAfter_27th - f28.Amount
            WHEN f28.Direction = 'CREDIT' THEN tl.TrueLastBalanceAfter_27th + f28.Amount
            ELSE tl.TrueLastBalanceAfter_27th
        END) AS Gap
    FROM first_on_28 f28
    JOIN true_last_27 tl ON tl.UserId = f28.UserId
    WHERE f28.rn = 1
)
SELECT
    g.UserId,
    u.user_id AS Username,
    g.Gap AS GapSum,
    w.AvailableBalance AS CurrentBalance,
    w.AvailableBalance - g.Gap AS NewBalance
INTO #ss38_fix_preview
FROM gaps g
JOIN tbm_user u ON u.id = g.UserId
JOIN tbs_auction_user_wallet w ON w.UserId = g.UserId
WHERE g.Gap > 0;

-- Review this before deciding COMMIT or ROLLBACK:
SELECT * FROM #ss38_fix_preview ORDER BY Username;

-- Apply the wallet deduction
UPDATE w
SET w.AvailableBalance = p.NewBalance
FROM tbs_auction_user_wallet w
JOIN #ss38_fix_preview p ON p.UserId = w.UserId;

-- Log it as a real transaction so history stays complete
INSERT INTO tbs_auction_transactions (UserId, Amount, Direction, Type, Description, BalanceAfter, CreatedAt)
SELECT
    UserId,
    GapSum,
    'DEBIT',
    'CONTRACT_RENEWAL_SS38_FIX',
    N'แก้ไขข้อมูล: หักเงินค่าต่อสัญญา Season 38 ที่หายไปจากบั๊กเปิดฤดูกาลซ้ำ (ระบบคืนเงินผิดพลาดไปก่อนหน้านี้)',
    NewBalance,
    GETUTCDATE()
FROM #ss38_fix_preview;

-- Show the final result for one more check
SELECT p.Username, p.CurrentBalance AS OldBalance, p.NewBalance, w.AvailableBalance AS ConfirmedBalance
FROM #ss38_fix_preview p
JOIN tbs_auction_user_wallet w ON w.UserId = p.UserId
ORDER BY p.Username;

DROP TABLE #ss38_fix_preview;

/*
   >>> Nothing above is permanent yet. Look at the SELECT results.
       If correct, run:  COMMIT TRAN;
       If anything is off, run:  ROLLBACK TRAN;
*/
