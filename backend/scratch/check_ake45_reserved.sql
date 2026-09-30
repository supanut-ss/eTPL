/* Read-only. Check AKE45's wallet vs what SHOULD be reserved based on active auctions
   where they are the current highest bidder (Normal phase) or have a Final-phase bid. */

DECLARE @UserId INT = (SELECT id FROM tbm_user WHERE user_id = 'AKE45');

SELECT u.user_id, w.AvailableBalance, w.ReservedBalance
FROM tbm_user u
JOIN tbs_auction_user_wallet w ON w.UserId = u.id
WHERE u.id = @UserId;

-- Auctions where AKE45 is currently the highest (Normal phase) bidder
SELECT ab.auction_id, p.player_name, ab.DbStatus, ab.CurrentPrice, ab.HighestBidderId
FROM tbs_auction_board ab
JOIN pes_player_team p ON p.id_player = ab.PlayerId
WHERE ab.DbStatus = 'Active' AND ab.HighestBidderId = @UserId;

-- AKE45's Final-phase bids on still-Active auctions
SELECT bl.log_id, bl.AuctionId, p.player_name, bl.BidAmount, bl.Phase, bl.CreatedAt
FROM tbs_auction_bid_log bl
JOIN tbs_auction_board ab ON ab.auction_id = bl.AuctionId
JOIN pes_player_team p ON p.id_player = ab.PlayerId
WHERE bl.UserId = @UserId AND bl.Phase = 'Final' AND ab.DbStatus = 'Active';

-- All of AKE45's transactions in the last 3 days (to see recent bid/refund activity)
SELECT t.transaction_id, t.Amount, t.Direction, t.Type, t.Description, t.BalanceAfter, t.CreatedAt
FROM tbs_auction_transactions t
WHERE t.UserId = @UserId AND t.CreatedAt >= DATEADD(day, -3, GETUTCDATE())
ORDER BY t.CreatedAt;
