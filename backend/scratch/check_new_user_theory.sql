/* Check whether "no gap" users are simply users who joined recently (during SS38),
   vs users who already had a squad/history before SS38 started. */

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
),
first_tx_per_user AS (
    SELECT UserId, MIN(CreatedAt) AS FirstTxDate, COUNT(*) AS TotalTxCount
    FROM tbs_auction_transactions
    GROUP BY UserId
),
had_renewal_at_ss38_39_boundary AS (
    SELECT DISTINCT UserId
    FROM tbs_auction_transactions
    WHERE Type = 'CONTRACT_RENEWAL_AUTO' AND Description LIKE '%(Season 39)%'
)
SELECT
    u.user_id AS Username,
    u.id AS UserId,
    CASE WHEN g.UserId IS NULL THEN 'NO GAP' ELSE 'HAS GAP' END AS GapStatus,
    f.FirstTxDate,
    f.TotalTxCount,
    CASE WHEN r.UserId IS NULL THEN 'NO' ELSE 'YES' END AS HadSeason39Renewal
FROM tbm_user u
LEFT JOIN users_with_gap g ON g.UserId = u.id
LEFT JOIN first_tx_per_user f ON f.UserId = u.id
LEFT JOIN had_renewal_at_ss38_39_boundary r ON r.UserId = u.id
ORDER BY GapStatus, f.FirstTxDate;
