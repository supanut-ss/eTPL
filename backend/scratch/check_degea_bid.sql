/* Read-only. Find the De Gea auction, its current status, and Tle_berlin's bid(s) on it. */

SELECT ab.auction_id, ab.PlayerId, p.player_name, ab.DbStatus, ab.CurrentPrice,
       ab.HighestBidderId, hb.user_id AS HighestBidderName
FROM tbs_auction_board ab
JOIN pes_player_team p ON p.id_player = ab.PlayerId
LEFT JOIN tbm_user hb ON hb.id = ab.HighestBidderId
WHERE p.player_name LIKE '%De Gea%' OR p.player_name LIKE '%de Gea%'
ORDER BY ab.auction_id DESC;

-- All bids on that auction (normal + final phase), newest first
SELECT bl.log_id, bl.AuctionId, u.user_id AS Username, bl.UserId, bl.BidAmount, bl.Phase, bl.CreatedAt
FROM tbs_auction_bid_log bl
JOIN tbm_user u ON u.id = bl.UserId
WHERE bl.AuctionId IN (
    SELECT ab.auction_id FROM tbs_auction_board ab
    JOIN pes_player_team p ON p.id_player = ab.PlayerId
    WHERE p.player_name LIKE '%De Gea%' OR p.player_name LIKE '%de Gea%'
)
ORDER BY bl.AuctionId DESC, bl.CreatedAt DESC;

-- Tle_berlin's wallet right now
SELECT u.user_id, w.AvailableBalance, w.ReservedBalance
FROM tbm_user u
JOIN tbs_auction_user_wallet w ON w.UserId = u.id
WHERE u.user_id = 'Tle_berlin';
