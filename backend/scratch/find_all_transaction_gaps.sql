/* =========================================================================
   PURPOSE
   Read-only audit. Walks EVERY transaction of EVERY user, in chronological
   order, and flags every point where BalanceAfter doesn't match what the
   previous transaction's BalanceAfter + this transaction's own Amount/
   Direction would produce (AUCTION_WIN is treated as a no-op, since it's
   already debited earlier as AUCTION_BID - matching the original
   audit_wallets.ps1 logic).

   This is a per-transaction-pair diagnostic, not an auto-fix. Some rows
   here may be FALSE POSITIVES for transaction types whose business logic
   is more complex than a simple prev +/- amount (e.g. FINAL_BID_REFUND may
   only refund a partial/difference amount, or interact with
   ReservedBalance) - review each Type before assuming it's a real bug.
   Known real bugs already found and fixed:
     - SPECIAL_BONUS: BalanceAfter was always logged as 0 (fixed in
       BonusController.cs + fix_special_bonus_balance_after.sql)
     - CONTRACT_RENEWAL_AUTO around 2026-09-27/28: season-open
       revert-without-recharge bug (see fix_ss38_balance_gap.sql)
   Run this AFTER applying fix_special_bonus_balance_after.sql so those
   rows don't show up as noise here.
   ========================================================================= */

WITH ordered_tx AS (
    SELECT
        t.transaction_id,
        t.UserId,
        u.user_id AS Username,
        t.Amount,
        t.Direction,
        t.Type,
        t.Description,
        t.BalanceAfter,
        t.CreatedAt,
        LAG(t.BalanceAfter) OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS PrevBalanceAfter,
        LAG(t.transaction_id) OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS PrevTxId,
        LAG(t.Type) OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS PrevType,
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
SELECT * FROM (
    SELECT
        Username,
        UserId,
        BalanceAfter - ExpectedBalanceAfter AS Gap,
        PrevTxId,
        PrevType,
        PrevBalanceAfter,
        PrevCreatedAt,
        transaction_id AS NextTxId,
        Type AS NextType,
        Direction AS NextDirection,
        Amount AS NextAmount,
        BalanceAfter AS NextBalanceAfter,
        ExpectedBalanceAfter,
        CreatedAt AS NextCreatedAt,
        Description,
        ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY CreatedAt DESC, transaction_id DESC) AS rn
    FROM expected
    WHERE ExpectedBalanceAfter IS NOT NULL
      AND BalanceAfter <> ExpectedBalanceAfter
      AND Type NOT IN ('FINAL_BID_REFUND', 'AUCTION_BID')
      AND PrevType NOT IN ('FINAL_BID_REFUND', 'AUCTION_BID')
) g
WHERE rn = 1
ORDER BY Username;


-- Users NOT in the list above (no unexplained gap found, excluding FINAL_BID_REFUND/AUCTION_BID noise)
WITH ordered_tx AS (
    SELECT
        t.transaction_id, t.UserId, t.Amount, t.Direction, t.Type, t.BalanceAfter, t.CreatedAt,
        LAG(t.BalanceAfter) OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS PrevBalanceAfter,
        LAG(t.Type) OVER (PARTITION BY t.UserId ORDER BY t.CreatedAt ASC, t.transaction_id ASC) AS PrevType
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
users_with_gap AS (
    SELECT DISTINCT UserId
    FROM expected
    WHERE ExpectedBalanceAfter IS NOT NULL
      AND BalanceAfter <> ExpectedBalanceAfter
      AND Type NOT IN ('FINAL_BID_REFUND', 'AUCTION_BID')
      AND PrevType NOT IN ('FINAL_BID_REFUND', 'AUCTION_BID')
)
SELECT
    u.user_id AS Username,
    u.id AS UserId,
    w.AvailableBalance,
    w.ReservedBalance
FROM tbm_user u
LEFT JOIN tbs_auction_user_wallet w ON w.UserId = u.id
WHERE u.id NOT IN (SELECT UserId FROM users_with_gap)
ORDER BY Username;


-- Summary: how many gap rows per transaction Type, to spot patterns quickly
WITH ordered_tx AS (
    SELECT
        t.transaction_id, t.UserId, t.Amount, t.Direction, t.Type, t.BalanceAfter, t.CreatedAt,
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
)
SELECT Type, COUNT(*) AS GapCount, SUM(BalanceAfter - ExpectedBalanceAfter) AS TotalGapAmount
FROM expected
WHERE ExpectedBalanceAfter IS NOT NULL AND BalanceAfter <> ExpectedBalanceAfter
  AND Type NOT IN ('FINAL_BID_REFUND', 'AUCTION_BID')
GROUP BY Type
ORDER BY GapCount DESC;
