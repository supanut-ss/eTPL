/* Read-only. Check Wesley Fofana's auction status, bids, and current squad ownership. */

SELECT ab.auction_id, p.player_name, ab.DbStatus, ab.CurrentPrice, ab.HighestBidderId, hb.user_id AS HighestBidderName,
       ab.NormalEndTime, ab.FinalEndTime
FROM tbs_auction_board ab
JOIN pes_player_team p ON p.id_player = ab.PlayerId
LEFT JOIN tbm_user hb ON hb.id = ab.HighestBidderId
WHERE p.player_name LIKE '%Fofana%'
ORDER BY ab.auction_id DESC;

SELECT bl.log_id, bl.AuctionId, u.user_id AS Username, bl.BidAmount, bl.Phase, bl.CreatedAt
FROM tbs_auction_bid_log bl
JOIN tbm_user u ON u.id = bl.UserId
WHERE bl.AuctionId IN (
    SELECT ab.auction_id FROM tbs_auction_board ab
    JOIN pes_player_team p ON p.id_player = ab.PlayerId
    WHERE p.player_name LIKE '%Fofana%'
)
ORDER BY bl.AuctionId DESC, bl.CreatedAt DESC;

SELECT u.user_id AS Username, s.SquadId, p.player_name, s.Status, s.PricePaid
FROM tbs_auction_squad s
JOIN pes_player_team p ON p.id_player = s.PlayerId
JOIN tbm_user u ON u.id = s.UserId
WHERE p.player_name LIKE '%Fofana%';
