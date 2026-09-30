/* Remove TPL_KING-HENRY14's Normal-phase bid (81) on auction 2983 (Marcos Llorente).
   He was outbid by LUNGTON_19 (82) shortly after - his reserved money for this
   bid was already released automatically when outbid (his current
   ReservedBalance = 0, confirming no money is still held for this bid).
   Pure history-cleanup delete, no wallet change needed.

   Not touching the Final-phase bids (LNWFIFA 100, OATRIDER 103, LUNGTON_19 87)
   or the auction's CurrentPrice/HighestBidderId.
*/

BEGIN TRAN;

-- Preview what will be deleted
SELECT bl.log_id, u.user_id AS Username, bl.AuctionId, bl.BidAmount, bl.Phase, bl.CreatedAt
FROM tbs_auction_bid_log bl
JOIN tbm_user u ON u.id = bl.UserId
WHERE bl.log_id = 5135 AND bl.UserId = (SELECT id FROM tbm_user WHERE user_id = 'TPL_KING-HENRY14');

DELETE FROM tbs_auction_bid_log
WHERE log_id = 5135 AND UserId = (SELECT id FROM tbm_user WHERE user_id = 'TPL_KING-HENRY14');

-- Confirm it's gone, and everything else on auction 2983 is untouched
SELECT bl.log_id, u.user_id AS Username, bl.AuctionId, bl.BidAmount, bl.Phase, bl.CreatedAt
FROM tbs_auction_bid_log bl
JOIN tbm_user u ON u.id = bl.UserId
WHERE bl.AuctionId = 2983
ORDER BY bl.CreatedAt;

/*
   >>> Review the two result sets above (first: the row being removed;
       second: what remains on auction 2983). If correct:  COMMIT TRAN;
       Otherwise:  ROLLBACK TRAN;
*/
