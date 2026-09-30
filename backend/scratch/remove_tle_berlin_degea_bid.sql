/* Remove Tle_berlin's Normal-phase bid (83) on auction 2904 (David de Gea).
   Tle_berlin was outbid by CAPIRE (84) same day - his reserved money for this
   bid was already released automatically when outbid (his current
   ReservedBalance = 78, not 83+78, confirming no money is still held for
   this specific bid). So this is a pure history-cleanup delete, no wallet
   change needed.

   Not touching the two Final-phase bids (NAVIGATLE 183, CAPIRE 127) or the
   auction's CurrentPrice/HighestBidderId - those are unaffected either way.
*/

BEGIN TRAN;

-- Preview what will be deleted
SELECT bl.log_id, u.user_id AS Username, bl.AuctionId, bl.BidAmount, bl.Phase, bl.CreatedAt
FROM tbs_auction_bid_log bl
JOIN tbm_user u ON u.id = bl.UserId
WHERE bl.log_id = 5139 AND bl.UserId = (SELECT id FROM tbm_user WHERE user_id = 'Tle_berlin');

DELETE FROM tbs_auction_bid_log
WHERE log_id = 5139 AND UserId = (SELECT id FROM tbm_user WHERE user_id = 'Tle_berlin');

-- Confirm it's gone, and that the auction / other bids are untouched
SELECT bl.log_id, u.user_id AS Username, bl.AuctionId, bl.BidAmount, bl.Phase, bl.CreatedAt
FROM tbs_auction_bid_log bl
JOIN tbm_user u ON u.id = bl.UserId
WHERE bl.AuctionId = 2904
ORDER BY bl.CreatedAt;

/*
   >>> Review the two result sets above (first: the row being removed;
       second: what remains on auction 2904). If correct:  COMMIT TRAN;
       Otherwise:  ROLLBACK TRAN;
*/
