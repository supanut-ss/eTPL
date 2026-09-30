/* Read-only. Dig into HUDYADJR10, BAW18, OATRIDER - flagged with ReservedBalance
   mismatch but NOT found in the FINAL_BID_REFUND duplicate check, so this is
   likely a different bug. Look at their recent auction-related transactions
   and any auctions they were involved in that are no longer Active
   (Cancelled/Sold) to see if a refund/release was missed somewhere. */

DECLARE @Names TABLE (user_id NVARCHAR(100));
INSERT INTO @Names VALUES ('HUDYADJR10'), ('BAW18'), ('OATRIDER');

-- Recent transactions (last 14 days) for these 3 users
SELECT u.user_id AS Username, t.transaction_id, t.Amount, t.Direction, t.Type,
       t.Description, t.BalanceAfter, t.RelatedAuctionId, t.CreatedAt
FROM tbs_auction_transactions t
JOIN tbm_user u ON u.id = t.UserId
WHERE u.user_id IN (SELECT user_id FROM @Names)
  AND t.CreatedAt >= DATEADD(day, -14, GETUTCDATE())
ORDER BY Username, t.CreatedAt;

-- All auctions these 3 users have EVER bid on/won, with current status
SELECT DISTINCT u.user_id AS Username, ab.auction_id, p.player_name, ab.DbStatus,
       ab.CurrentPrice, ab.HighestBidderId,
       CASE WHEN ab.HighestBidderId = u.id THEN 'YES' ELSE 'no' END AS IsCurrentHighest
FROM tbs_auction_bid_log bl
JOIN tbm_user u ON u.id = bl.UserId
JOIN tbs_auction_board ab ON ab.auction_id = bl.AuctionId
LEFT JOIN pes_player_team p ON p.id_player = ab.PlayerId
WHERE u.user_id IN (SELECT user_id FROM @Names)
ORDER BY Username, ab.auction_id DESC;
