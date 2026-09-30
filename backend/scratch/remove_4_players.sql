/* =========================================================================
   PURPOSE
   Fully remove Antoine Griezmann, Talisca, Christopher Nkunku, Lennart Karl
   from the system (pes_player_team), after cleanly unwinding everything
   that currently references them:
     1. Cancel Talisca's ACTIVE auction #3202 and refund F9ST_IVANDER 79 TP.
     2. Remove Christopher Nkunku from TPL_KING-HENRY14's squad and refund
        78 TP (treated like a FREE_RELEASE).
     3. Delete all historical bid_log + auction_board rows for these 4
        players (Cancelled/Sold), and their favourites rows.
     4. Null out RelatedPlayerId on existing transactions referencing them
        (financial history itself is kept, just the dangling FK is cleared).
     5. Delete the 4 player rows from pes_player_team.

   HOW TO USE
   1. Run STEP 1 (read-only preview) to confirm the player ids match.
   2. Run STEP 2 (BEGIN TRAN, not auto-committed).
   3. COMMIT TRAN; if everything looks right, or ROLLBACK TRAN; if not.
   ========================================================================= */

DECLARE @PlayerIds TABLE (id_player INT);
INSERT INTO @PlayerIds VALUES (42316), (63509), (108984), (176197);
-- 42316 = Antoine Griezmann, 63509 = Talisca, 108984 = Christopher Nkunku, 176197 = Lennart Karl


/* ---------------------------------------------------------------------
   STEP 1: READ-ONLY PREVIEW
   --------------------------------------------------------------------- */
SELECT * FROM pes_player_team WHERE id_player IN (SELECT id_player FROM @PlayerIds);

SELECT auction_id, PlayerId, DbStatus, CurrentPrice, HighestBidderId
FROM tbs_auction_board WHERE PlayerId IN (SELECT id_player FROM @PlayerIds);

SELECT * FROM tbs_auction_squad WHERE PlayerId IN (SELECT id_player FROM @PlayerIds);


/* ---------------------------------------------------------------------
   STEP 2: APPLY
   --------------------------------------------------------------------- */
BEGIN TRAN;

-- 1. Cancel Talisca's active auction (#3202) and refund the current highest bidder
DECLARE @TaliscaAuctionId INT = 3202;
DECLARE @TaliscaBidderId INT, @TaliscaPrice INT;

SELECT @TaliscaBidderId = HighestBidderId, @TaliscaPrice = CurrentPrice
FROM tbs_auction_board WHERE auction_id = @TaliscaAuctionId AND DbStatus = 'Active';

IF @TaliscaBidderId IS NOT NULL
BEGIN
    UPDATE w
    SET w.AvailableBalance = w.AvailableBalance + @TaliscaPrice,
        w.ReservedBalance = w.ReservedBalance - @TaliscaPrice
    FROM tbs_auction_user_wallet w
    WHERE w.UserId = @TaliscaBidderId;

    INSERT INTO tbs_auction_transactions (UserId, Amount, Direction, Type, Description, BalanceAfter, RelatedAuctionId, RelatedPlayerId, CreatedAt)
    SELECT @TaliscaBidderId, @TaliscaPrice, 'CREDIT', 'AUCTION_REFUND',
           N'[Player Removed] คืนเงินจากการยกเลิกประมูล Talisca (นักเตะถูกลบออกจากระบบ)',
           w.AvailableBalance, @TaliscaAuctionId, 63509, GETUTCDATE()
    FROM tbs_auction_user_wallet w WHERE w.UserId = @TaliscaBidderId;

    UPDATE tbs_auction_board SET DbStatus = 'Cancelled' WHERE auction_id = @TaliscaAuctionId;
END

-- 2. Remove Christopher Nkunku from TPL_KING-HENRY14's squad, refund the price paid
DECLARE @NkunkuUserId INT, @NkunkuPricePaid INT, @NkunkuSquadId INT;

SELECT @NkunkuSquadId = s.SquadId, @NkunkuUserId = s.UserId, @NkunkuPricePaid = s.PricePaid
FROM tbs_auction_squad s
WHERE s.PlayerId = 108984 AND s.UserId = (SELECT id FROM tbm_user WHERE user_id = 'TPL_KING-HENRY14');

IF @NkunkuSquadId IS NOT NULL
BEGIN
    UPDATE w
    SET w.AvailableBalance = w.AvailableBalance + @NkunkuPricePaid
    FROM tbs_auction_user_wallet w
    WHERE w.UserId = @NkunkuUserId;

    INSERT INTO tbs_auction_transactions (UserId, Amount, Direction, Type, Description, BalanceAfter, RelatedPlayerId, CreatedAt)
    SELECT @NkunkuUserId, @NkunkuPricePaid, 'CREDIT', 'FREE_RELEASE',
           N'ปล่อย Christopher Nkunku (นักเตะถูกลบออกจากระบบ)',
           w.AvailableBalance, 108984, GETUTCDATE()
    FROM tbs_auction_user_wallet w WHERE w.UserId = @NkunkuUserId;

    DELETE FROM tbs_auction_squad WHERE SquadId = @NkunkuSquadId;
END

-- 3. Delete historical bid logs, then auction boards, then favourites for all 4 players
DELETE bl FROM tbs_auction_bid_log bl
JOIN tbs_auction_board ab ON ab.auction_id = bl.AuctionId
WHERE ab.PlayerId IN (SELECT id_player FROM @PlayerIds);

DELETE FROM tbs_auction_board WHERE PlayerId IN (SELECT id_player FROM @PlayerIds);

DELETE FROM tbs_auction_favourites WHERE PlayerId IN (SELECT id_player FROM @PlayerIds);

-- 4. Keep transaction history, just clear the dangling player reference
UPDATE tbs_auction_transactions
SET RelatedPlayerId = NULL
WHERE RelatedPlayerId IN (SELECT id_player FROM @PlayerIds);

-- 5. Finally remove the players themselves
DELETE FROM pes_player_team WHERE id_player IN (SELECT id_player FROM @PlayerIds);

-- Verify: should return 0 rows everywhere
SELECT 'pes_player_team' AS TableName, COUNT(*) AS Remaining FROM pes_player_team WHERE id_player IN (SELECT id_player FROM @PlayerIds)
UNION ALL
SELECT 'tbs_auction_board', COUNT(*) FROM tbs_auction_board WHERE PlayerId IN (SELECT id_player FROM @PlayerIds)
UNION ALL
SELECT 'tbs_auction_squad', COUNT(*) FROM tbs_auction_squad WHERE PlayerId IN (SELECT id_player FROM @PlayerIds)
UNION ALL
SELECT 'tbs_auction_favourites', COUNT(*) FROM tbs_auction_favourites WHERE PlayerId IN (SELECT id_player FROM @PlayerIds);

/*
   >>> All 4 counts above should be 0. If correct:  COMMIT TRAN;
       Otherwise:  ROLLBACK TRAN;
*/
