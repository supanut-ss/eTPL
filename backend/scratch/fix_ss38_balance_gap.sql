/* =========================================================================
   PURPOSE
   Some users' AvailableBalance jumped by an amount with no matching logged
   transaction, because a season-transition bug reverted their real SS38
   CONTRACT_RENEWAL_AUTO charges (credited the money back) without ever
   re-charging an equivalent SS38 amount. This script finds that gap per
   user and re-applies it as a real, logged DEBIT transaction, so wallets
   end up correct and the history stays complete.

   HOW TO USE
   1. Run STEP 1 (read-only). Review every row - each one is a point where
      BalanceAfter didn't match what the previous transaction + this
      transaction's own Amount would produce.
   2. Only rows with Gap > 0 (money appeared) are auto-fixable by STEP 2.
      Gap < 0 (money disappeared) needs manual investigation - do not
      blindly apply STEP 2 if you see any negative gaps you haven't
      explained yet.
   3. Run STEP 2. It runs inside an explicit transaction and PRINTs what it
      is about to change, then leaves the transaction OPEN.
   4. Inspect the PRINT output and the #ss38_fix_preview temp table.
      If it looks correct: COMMIT TRAN
      If anything looks wrong: ROLLBACK TRAN
   ========================================================================= */


/* ---------------------------------------------------------------------
   STEP 1: READ-ONLY DIAGNOSTIC - list every balance-continuity gap
   --------------------------------------------------------------------- */
WITH ordered_tx AS (
    SELECT
        t.transaction_id,
        t.UserId,
        u.user_id AS Username,
        t.Amount,
        t.Direction,
        t.Type,
        t.BalanceAfter,
        t.CreatedAt,
        LAG(t.BalanceAfter) OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS PrevBalanceAfter,
        LAG(t.transaction_id) OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS PrevTxId,
        LAG(t.CreatedAt) OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS PrevCreatedAt
    FROM tbs_auction_transactions t
    JOIN tbm_user u ON u.id = t.UserId
),
expected AS (
    SELECT *,
        CASE
            WHEN PrevBalanceAfter IS NULL THEN NULL
            WHEN Type = 'AUCTION_WIN' THEN PrevBalanceAfter
            WHEN Direction = 'DEBIT' THEN PrevBalanceAfter - Amount
            WHEN Direction = 'CREDIT' THEN PrevBalanceAfter + Amount
            ELSE PrevBalanceAfter
        END AS ExpectedBalanceAfter
    FROM ordered_tx
)
SELECT
    Username,
    UserId,
    BalanceAfter - ExpectedBalanceAfter AS Gap,
    PrevTxId,
    PrevBalanceAfter,
    PrevCreatedAt,
    transaction_id AS NextTxId,
    Type AS NextType,
    BalanceAfter AS NextBalanceAfter,
    CreatedAt AS NextCreatedAt
FROM expected
WHERE ExpectedBalanceAfter IS NOT NULL
  AND BalanceAfter <> ExpectedBalanceAfter
ORDER BY Username, NextCreatedAt;


/* ---------------------------------------------------------------------
   STEP 2: APPLY FIX - only for positive gaps (money that appeared).
   Wrapped in an explicit transaction that is NOT committed automatically.
   --------------------------------------------------------------------- */
BEGIN TRAN;

WITH ordered_tx AS (
    SELECT
        t.transaction_id,
        t.UserId,
        t.Amount,
        t.Direction,
        t.Type,
        t.BalanceAfter,
        t.CreatedAt,
        LAG(t.BalanceAfter) OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS PrevBalanceAfter
    FROM tbs_auction_transactions t
),
expected AS (
    SELECT *,
        CASE
            WHEN PrevBalanceAfter IS NULL THEN NULL
            WHEN Type = 'AUCTION_WIN' THEN PrevBalanceAfter
            WHEN Direction = 'DEBIT' THEN PrevBalanceAfter - Amount
            WHEN Direction = 'CREDIT' THEN PrevBalanceAfter + Amount
            ELSE PrevBalanceAfter
        END AS ExpectedBalanceAfter
    FROM ordered_tx
),
gaps_per_user AS (
    SELECT UserId, SUM(BalanceAfter - ExpectedBalanceAfter) AS GapSum
    FROM expected
    WHERE ExpectedBalanceAfter IS NOT NULL
      AND BalanceAfter > ExpectedBalanceAfter   -- only positive gaps; negative gaps are skipped on purpose
    GROUP BY UserId
)
SELECT
    g.UserId,
    u.user_id AS Username,
    g.GapSum,
    w.AvailableBalance AS CurrentBalance,
    w.AvailableBalance - g.GapSum AS NewBalance
INTO #ss38_fix_preview
FROM gaps_per_user g
JOIN tbm_user u ON u.id = g.UserId
JOIN tbs_auction_user_wallet w ON w.UserId = g.UserId
WHERE g.GapSum > 0;

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
