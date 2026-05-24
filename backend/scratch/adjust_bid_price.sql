-- ==========================================================================
-- SQL SCRIPT FOR ADJUSTING AUCTION BID PRICE (Active / Sold)
-- Location: backend/scratch/adjust_bid_price.sql
-- ==========================================================================
BEGIN TRANSACTION;

BEGIN TRY
    -- 1. กำหนดค่าตัวแปรสำหรับแก้ไข (กรุณาแก้ไขที่นี่) ------------------------
    DECLARE @TargetAuctionId INT = 123;   -- ใส่ Auction ID ที่ต้องการแก้ที่นี่
    DECLARE @NewPrice INT = 150;          -- ใส่ราคาใหม่ที่ต้องการปรับที่นี่
    ------------------------------------------------------------------------

    -- ตรวจสอบความถูกต้องและดึงข้อมูลเดิมของการประมูล
    DECLARE @OldPrice INT;
    DECLARE @Status VARCHAR(50);
    DECLARE @PlayerId INT;
    DECLARE @PlayerName NVARCHAR(100);
    DECLARE @HighestBidderId INT;

    SELECT 
        @OldPrice = ab.CurrentPrice,
        @Status = ab.DbStatus,
        @PlayerId = ab.PlayerId,
        @PlayerName = pp.player_name,
        @HighestBidderId = ab.HighestBidderId
    FROM tbs_auction_board ab
    LEFT JOIN pes_player_team pp ON pp.id_player = ab.PlayerId
    WHERE ab.auction_id = @TargetAuctionId;

    IF @OldPrice IS NULL
    BEGIN
        THROW 50001, 'Error: ไม่พบ Auction ID ดังกล่าวในระบบ', 1;
    END

    -- คำนวณส่วนต่างราคา (ราคาใหม่ - ราคาเก่า)
    -- เช่น 150 - 130 = +20 (ผู้บิดต้องจ่ายเพิ่ม 20 TP)
    -- เช่น 120 - 130 = -10 (ผู้บิดต้องได้เงินคืน 10 TP)
    DECLARE @PriceDiff INT = @NewPrice - @OldPrice;

    PRINT '=== เริ่มกระบวนการปรับปรุงราคาบิด ===';
    PRINT 'Auction ID: ' + CAST(@TargetAuctionId AS VARCHAR) + ' | นักเตะ: ' + @PlayerName;
    PRINT 'สถานะปัจจุบัน: ' + @Status + ' | ผู้ชนะ/บิดล่าสุด ID: ' + CAST(@HighestBidderId AS VARCHAR);
    PRINT 'ราคาเดิม: ' + CAST(@OldPrice AS VARCHAR) + ' TP -> ราคาใหม่: ' + CAST(@NewPrice AS VARCHAR) + ' TP';
    PRINT 'ส่วนต่างราคาที่ต้องดำเนินการ: ' + CAST(@PriceDiff AS VARCHAR) + ' TP';

    IF @PriceDiff = 0
    BEGIN
        THROW 50002, 'Error: ราคาใหม่และราคาเดิมเท่ากัน ไม่ต้องปรับปรุงข้อมูล', 1;
    END

    -- 2. ดำเนินการอัปเดตตามสถานะของการประมูล --------------------------------
    IF @Status = 'Active'
    BEGIN
        PRINT '>> ตรวจพบสถานะ: Active (กำลังประมูล)';

        -- A. อัปเดตราคาที่บอร์ดประมูล
        UPDATE tbs_auction_board
        SET CurrentPrice = @NewPrice
        WHERE auction_id = @TargetAuctionId;

        -- B. อัปเดตราคาใน Log การบิดล่าสุดของผู้บิดสูงสุดคนปัจจุบัน
        UPDATE tbs_auction_bid_log
        SET BidAmount = @NewPrice
        WHERE AuctionId = @TargetAuctionId 
          AND UserId = @HighestBidderId
          -- ค้นหารายการบิดล่าสุด (Log ที่มีจำนวนเงินเดิมเท่ากับราคาประมูลก่อนแก้ไข)
          AND BidAmount = @OldPrice;

        -- C. ปรับเงินประกันในกระเป๋า (Wallet) ของผู้นำประมูล
        -- (หัก AvailableBalance ออกตามส่วนต่าง และนำไปเพิ่มใน ReservedBalance ที่ถูกล็อกไว้)
        UPDATE tbs_auction_user_wallet
        SET 
            AvailableBalance = AvailableBalance - @PriceDiff,
            ReservedBalance = ReservedBalance + @PriceDiff
        WHERE UserId = @HighestBidderId;

        -- D. บันทึกประวัติรายการธุรกรรม (Transaction Log)
        INSERT INTO tbs_auction_transactions (
            UserId, Amount, Direction, Type, Description, BalanceAfter, RelatedAuctionId, RelatedPlayerId, CreatedAt
        ) VALUES (
            @HighestBidderId,
            ABS(@PriceDiff),
            CASE WHEN @PriceDiff > 0 THEN 'DEBIT' ELSE 'CREDIT' END,
            'ADJUSTMENT',
            CONCAT('[System Adjustment] แก้ไขราคาบิด ', @PlayerName, ' (Auction ', @TargetAuctionId, ') จาก ', @OldPrice, ' เป็น ', @NewPrice, ' TP'),
            (SELECT AvailableBalance FROM tbs_auction_user_wallet WHERE UserId = @HighestBidderId),
            @TargetAuctionId,
            @PlayerId,
            GETUTCDATE()
        );

        PRINT '>> ปรับปรุงข้อมูลช่วง Active สำเร็จ!';
    END
    ELSE IF @Status = 'Sold'
    BEGIN
        PRINT '>> ตรวจพบสถานะ: Sold (ประมูลและขายสำเร็จแล้ว)';

        -- A. อัปเดตราคาที่บอร์ดประมูล
        UPDATE tbs_auction_board
        SET CurrentPrice = @NewPrice
        WHERE auction_id = @TargetAuctionId;

        -- B. อัปเดตราคาใน Log การบิดที่ชนะประมูล
        UPDATE tbs_auction_bid_log
        SET BidAmount = @NewPrice
        WHERE AuctionId = @TargetAuctionId 
          AND UserId = @HighestBidderId
          AND BidAmount = @OldPrice;

        -- C. อัปเดตค่าตัว (PricePaid) ของนักเตะในทีม
        UPDATE tbs_auction_squad
        SET PricePaid = @NewPrice
        WHERE UserId = @HighestBidderId 
          AND PlayerId = @PlayerId 
          AND IsLoan = 0; -- อัปเดตเฉพาะสัญญาหลัก (ไม่ใช่ยืมตัว)

        -- D. ปรับเงินในกระเป๋า (Wallet) ของผู้ซื้อนักเตะ
        -- (เนื่องจากดีลจบแล้ว เงินมัดจำ/ประกันถูกเคลียร์ไปหมดแล้ว จึงปรับที่ AvailableBalance โดยตรง)
        UPDATE tbs_auction_user_wallet
        SET AvailableBalance = AvailableBalance - @PriceDiff
        WHERE UserId = @HighestBidderId;

        -- E. บันทึกประวัติรายการธุรกรรม (Transaction Log)
        INSERT INTO tbs_auction_transactions (
            UserId, Amount, Direction, Type, Description, BalanceAfter, RelatedAuctionId, RelatedPlayerId, CreatedAt
        ) VALUES (
            @HighestBidderId,
            ABS(@PriceDiff),
            CASE WHEN @PriceDiff > 0 THEN 'DEBIT' ELSE 'CREDIT' END,
            'ADJUSTMENT',
            CONCAT('[System Adjustment] แก้ไขราคาซื้อนักเตะ ', @PlayerName, ' (Auction ', @TargetAuctionId, ') จาก ', @OldPrice, ' เป็น ', @NewPrice, ' TP'),
            (SELECT AvailableBalance FROM tbs_auction_user_wallet WHERE UserId = @HighestBidderId),
            @TargetAuctionId,
            @PlayerId,
            GETUTCDATE()
        );

        PRINT '>> ปรับปรุงข้อมูลช่วง Sold สำเร็จ!';
    END
    ELSE
    BEGIN
        -- ป้องกันการแก้ไขเมื่อประมูลถูกยกเลิก (Cancelled) หรือสถานะอื่นที่ไม่สอดคล้อง
        DECLARE @ErrMsg NVARCHAR(200) = CONCAT('Error: ไม่สามารถแก้ไขราคาได้เนื่องจากการประมูลมีสถานะเป็น ', @Status);
        THROW 50003, @ErrMsg, 1;
    END

    -- ยืนยันธุรกรรมเมื่อไม่มีสิ่งใดผิดพลาด
    COMMIT TRANSACTION;
    PRINT '=======================================';
    PRINT 'SUCCESS: บันทึกข้อมูลและปรับปรุงยอดเงินสำเร็จ!';
    PRINT '=======================================';

END TRY
BEGIN CATCH
    -- ยกเลิกการเปลี่ยนแปลงทั้งหมดในกรณีที่เกิด Error
    IF @@TRANCOUNT > 0
    BEGIN
        ROLLBACK TRANSACTION;
    END

    PRINT '=======================================';
    PRINT 'ERROR DETECTED - TRANSACTION ROLLED BACK!';
    PRINT 'Error Message: ' + ERROR_MESSAGE();
    PRINT '=======================================';
END CATCH;
