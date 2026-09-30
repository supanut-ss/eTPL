/* =========================================================================
   PURPOSE
   For the 6 users confirmed to have a duplicate FINAL_BID_REFUND
   (SHIRODV, TWE_VTRZ08, NOOM_SINCE1979, AKE45, JEDDEE, NUTTKUNG29):
   1. Recompute ReservedBalance correctly from CURRENT live auction state
      (not a stale snapshot) - option 1 the admin chose.
   2. Add the historical duplicate-refund excess to DebtAmount, to be clawed
      back only from future SPECIAL_BONUS/CYCLE_BONUS credits (handled by
      WalletDebtHelper in the app - already deployed).
   3. Notify each affected user in-app.

   Does NOT touch AvailableBalance at all - money already spent is left alone.

   PREREQUISITE: run add_debt_column.sql FIRST (adds the DebtAmount column).

   HOW TO USE
   1. Run STEP 1 (read-only preview).
   2. Run STEP 2 (BEGIN TRAN, not auto-committed).
   3. COMMIT TRAN; if correct, or ROLLBACK TRAN; if not.
   ========================================================================= */

DECLARE @TargetUsers TABLE (user_id NVARCHAR(100));
INSERT INTO @TargetUsers VALUES ('SHIRODV'), ('TWE_VTRZ08'), ('NOOM_SINCE1979'), ('AKE45'), ('JEDDEE'), ('NUTTKUNG29');


/* ---------------------------------------------------------------------
   STEP 1: READ-ONLY PREVIEW
   --------------------------------------------------------------------- */
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
    SELECT UserId, SUM(BidAmount) AS Amt FROM final_bids GROUP BY UserId
),
final_override_subtract AS (
    SELECT fb.UserId, SUM(ab.CurrentPrice) AS Amt
    FROM final_bids fb
    JOIN tbs_auction_board ab ON ab.auction_id = fb.AuctionId AND ab.HighestBidderId = fb.UserId
    GROUP BY fb.UserId
),
expected_reserved AS (
    SELECT u.id AS UserId,
        ISNULL(nr.Amt, 0) + ISNULL(fr.Amt, 0) - ISNULL(fos.Amt, 0) AS ExpectedReserved
    FROM tbm_user u
    LEFT JOIN normal_reserved nr ON nr.UserId = u.id
    LEFT JOIN final_reserved fr ON fr.UserId = u.id
    LEFT JOIN final_override_subtract fos ON fos.UserId = u.id
),
dupes AS (
    SELECT t.UserId, t.RelatedAuctionId, t.Amount,
        LAG(t.CreatedAt) OVER (PARTITION BY t.UserId, t.RelatedAuctionId, t.Amount ORDER BY t.CreatedAt) AS PrevCreatedAt,
        t.CreatedAt
    FROM tbs_auction_transactions t
    WHERE t.Type = 'FINAL_BID_REFUND'
),
excess_per_user AS (
    SELECT UserId, SUM(Amount) AS ExcessAmount
    FROM dupes
    WHERE PrevCreatedAt IS NOT NULL AND DATEDIFF(MILLISECOND, PrevCreatedAt, CreatedAt) < 5000
    GROUP BY UserId
)
SELECT
    u.user_id AS Username,
    w.AvailableBalance,
    w.ReservedBalance AS CurrentReserved,
    er.ExpectedReserved AS NewReserved,
    ISNULL(w.DebtAmount, 0) AS CurrentDebt,
    ex.ExcessAmount,
    ISNULL(w.DebtAmount, 0) + ex.ExcessAmount AS NewDebt
FROM tbm_user u
JOIN @TargetUsers tu ON tu.user_id = u.user_id
JOIN tbs_auction_user_wallet w ON w.UserId = u.id
LEFT JOIN expected_reserved er ON er.UserId = u.id
LEFT JOIN excess_per_user ex ON ex.UserId = u.id
ORDER BY Username;


/* ---------------------------------------------------------------------
   STEP 2: APPLY FIX
   --------------------------------------------------------------------- */
BEGIN TRAN;

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
    SELECT UserId, SUM(BidAmount) AS Amt FROM final_bids GROUP BY UserId
),
final_override_subtract AS (
    SELECT fb.UserId, SUM(ab.CurrentPrice) AS Amt
    FROM final_bids fb
    JOIN tbs_auction_board ab ON ab.auction_id = fb.AuctionId AND ab.HighestBidderId = fb.UserId
    GROUP BY fb.UserId
),
expected_reserved AS (
    SELECT u.id AS UserId,
        ISNULL(nr.Amt, 0) + ISNULL(fr.Amt, 0) - ISNULL(fos.Amt, 0) AS ExpectedReserved
    FROM tbm_user u
    LEFT JOIN normal_reserved nr ON nr.UserId = u.id
    LEFT JOIN final_reserved fr ON fr.UserId = u.id
    LEFT JOIN final_override_subtract fos ON fos.UserId = u.id
),
dupes AS (
    SELECT t.UserId, t.RelatedAuctionId, t.Amount,
        LAG(t.CreatedAt) OVER (PARTITION BY t.UserId, t.RelatedAuctionId, t.Amount ORDER BY t.CreatedAt) AS PrevCreatedAt,
        t.CreatedAt
    FROM tbs_auction_transactions t
    WHERE t.Type = 'FINAL_BID_REFUND'
),
excess_per_user AS (
    SELECT UserId, SUM(Amount) AS ExcessAmount
    FROM dupes
    WHERE PrevCreatedAt IS NOT NULL AND DATEDIFF(MILLISECOND, PrevCreatedAt, CreatedAt) < 5000
    GROUP BY UserId
),
fix_plan AS (
    SELECT
        u.id AS UserId,
        u.user_id AS Username,
        er.ExpectedReserved AS NewReserved,
        ex.ExcessAmount
    FROM tbm_user u
    JOIN @TargetUsers tu ON tu.user_id = u.user_id
    LEFT JOIN expected_reserved er ON er.UserId = u.id
    LEFT JOIN excess_per_user ex ON ex.UserId = u.id
)
SELECT fp.UserId, fp.Username, fp.NewReserved, fp.ExcessAmount,
       w.AvailableBalance, w.ReservedBalance AS OldReserved, ISNULL(w.DebtAmount,0) AS OldDebt
INTO #fix_preview
FROM fix_plan fp
JOIN tbs_auction_user_wallet w ON w.UserId = fp.UserId;

SELECT * FROM #fix_preview ORDER BY Username;

UPDATE w
SET w.ReservedBalance = p.NewReserved,
    w.DebtAmount = p.OldDebt + ISNULL(p.ExcessAmount, 0)
FROM tbs_auction_user_wallet w
JOIN #fix_preview p ON p.UserId = w.UserId;

INSERT INTO tbs_notifications (UserId, Title, Message, IsRead, CreatedAt)
SELECT
    p.UserId,
    N'แจ้งแก้ไขยอดเงินในระบบ',
    N'ระบบตรวจพบว่าบัญชีของคุณได้รับเงินคืนซ้ำซ้อนจากบั๊กของระบบ (' + CAST(p.ExcessAmount AS NVARCHAR) +
        N' TP) ในการประมูลที่ไม่ชนะรอบ Final ช่วงที่ผ่านมา เราได้แก้ไขยอด Reserved ให้ถูกต้องแล้ว ' +
        N'ส่วนเงินที่ได้รับเกินมาจะถูกทยอยหักคืนจากโบนัสพิเศษ/โบนัสแข่งครบในอนาคตเท่านั้น (ไม่กระทบเงินที่ใช้ไปแล้ว) ' +
        N'จนกว่าจะครบจำนวน ขออภัยในความไม่สะดวกครับ',
    0,
    GETUTCDATE()
FROM #fix_preview p
WHERE p.ExcessAmount > 0;

-- Confirm result
SELECT p.Username, p.AvailableBalance, p.OldReserved, w.ReservedBalance AS NewReserved,
       p.OldDebt, w.DebtAmount AS NewDebt
FROM #fix_preview p
JOIN tbs_auction_user_wallet w ON w.UserId = p.UserId
ORDER BY p.Username;

DROP TABLE #fix_preview;

/*
   >>> Review both result sets above. If correct:  COMMIT TRAN;
       Otherwise:  ROLLBACK TRAN;
*/
