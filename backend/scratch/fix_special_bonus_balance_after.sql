/* =========================================================================
   PURPOSE
   BonusController.cs (ApproveBonus / ApproveAllBonuses) never set BalanceAfter
   on SPECIAL_BONUS transactions, so every one of them was stored as 0 -
   even though wallet.AvailableBalance itself was updated correctly at the
   time. This is a log-only bug (no real money is wrong), but it breaks
   audit trails and any script that reconstructs balances from the
   transaction log (like fix_ss38_balance_gap.sql).

   This recomputes the correct BalanceAfter for every existing SPECIAL_BONUS
   row from its own Amount (always CREDIT) plus the BalanceAfter of the
   transaction immediately before it for that user, and writes it back.

   Since transactions are processed in chronological order, if TWO
   SPECIAL_BONUS rows are adjacent (both currently 0), fixing them in one
   UPDATE won't chain correctly in a single pass - so this runs iteratively
   until no more 0-valued SPECIAL_BONUS rows remain that have a fixable
   predecessor. Rows before the report will print progress each pass.

   HOW TO USE
   1. Run STEP 1 (read-only) to see how many rows are affected.
   2. Run STEP 2 (wrapped in an explicit, uncommitted transaction).
   3. COMMIT TRAN; if the preview looks right, or ROLLBACK TRAN; if not.
   ========================================================================= */


/* ---------------------------------------------------------------------
   STEP 1: READ-ONLY DIAGNOSTIC
   --------------------------------------------------------------------- */
SELECT COUNT(*) AS BrokenSpecialBonusRows
FROM tbs_auction_transactions
WHERE Type = 'SPECIAL_BONUS' AND BalanceAfter = 0;

SELECT
    u.user_id AS Username,
    t.transaction_id,
    t.Amount,
    t.BalanceAfter AS CurrentlyStoredBalanceAfter,
    t.CreatedAt
FROM tbs_auction_transactions t
JOIN tbm_user u ON u.id = t.UserId
WHERE t.Type = 'SPECIAL_BONUS' AND t.BalanceAfter = 0
ORDER BY u.user_id, t.CreatedAt;


/* ---------------------------------------------------------------------
   STEP 2: APPLY FIX
   --------------------------------------------------------------------- */
BEGIN TRAN;

DECLARE @RowsFixed INT = 1;
DECLARE @TotalPasses INT = 0;

WHILE @RowsFixed > 0 AND @TotalPasses < 20
BEGIN
    ;WITH broken AS (
        SELECT
            t.transaction_id,
            t.UserId,
            t.Amount,
            t.CreatedAt,
            (
                SELECT TOP 1 t2.BalanceAfter
                FROM tbs_auction_transactions t2
                WHERE t2.UserId = t.UserId
                  AND (t2.CreatedAt < t.CreatedAt OR (t2.CreatedAt = t.CreatedAt AND t2.transaction_id < t.transaction_id))
                  AND NOT (t2.Type = 'SPECIAL_BONUS' AND t2.BalanceAfter = 0)  -- skip other still-broken rows
                ORDER BY t2.CreatedAt DESC, t2.transaction_id DESC
            ) AS PrevGoodBalance
        FROM tbs_auction_transactions t
        WHERE t.Type = 'SPECIAL_BONUS' AND t.BalanceAfter = 0
    )
    UPDATE t
    SET t.BalanceAfter = b.PrevGoodBalance + b.Amount
    FROM tbs_auction_transactions t
    JOIN broken b ON b.transaction_id = t.transaction_id
    WHERE b.PrevGoodBalance IS NOT NULL;

    SET @RowsFixed = @@ROWCOUNT;
    SET @TotalPasses += 1;
    PRINT CONCAT('Pass ', @TotalPasses, ': fixed ', @RowsFixed, ' row(s)');
END

-- Anything left with BalanceAfter = 0 has no valid predecessor (e.g. it's the
-- very first transaction ever for that user) - review these manually.
SELECT
    u.user_id AS Username,
    t.transaction_id,
    t.Amount,
    t.BalanceAfter,
    t.CreatedAt
FROM tbs_auction_transactions t
JOIN tbm_user u ON u.id = t.UserId
WHERE t.Type = 'SPECIAL_BONUS' AND t.BalanceAfter = 0
ORDER BY Username, t.CreatedAt;

/*
   >>> Nothing above is permanent yet.
       If the remaining-zero list above is empty (or only expected edge
       cases like a user's very first-ever transaction), run:  COMMIT TRAN;
       Otherwise:  ROLLBACK TRAN;
*/
