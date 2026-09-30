/* Read-only. Check current usage of these 3 players before deciding how to remove them. */

DECLARE @Names TABLE (name NVARCHAR(200));
INSERT INTO @Names VALUES ('Antoine Griezmann'), ('Lennart Karl'), ('Talisca'),('Christopher Nkunku');

-- 1. Player master rows
SELECT id_player, player_name, team_name, player_ovr
FROM pes_player_team
WHERE player_name IN (SELECT name FROM @Names);

-- 2. Anyone currently owns them in a squad
SELECT u.user_id AS Username, s.SquadId, p.player_name, s.Status, s.PricePaid, s.IsLoan
FROM tbs_auction_squad s
JOIN pes_player_team p ON p.id_player = s.PlayerId
JOIN tbm_user u ON u.id = s.UserId
WHERE p.player_name IN (SELECT name FROM @Names);

-- 3. Any auction (active or otherwise) referencing them
SELECT ab.auction_id, p.player_name, ab.DbStatus, ab.CurrentPrice, ab.HighestBidderId, hb.user_id AS HighestBidderName
FROM tbs_auction_board ab
JOIN pes_player_team p ON p.id_player = ab.PlayerId
LEFT JOIN tbm_user hb ON hb.id = ab.HighestBidderId
WHERE p.player_name IN (SELECT name FROM @Names)
ORDER BY p.player_name, ab.auction_id DESC;

-- 4. Any transactions referencing them (for FK check before hard delete)
SELECT COUNT(*) AS RelatedTransactionCount, p.player_name
FROM tbs_auction_transactions t
JOIN pes_player_team p ON p.id_player = t.RelatedPlayerId
WHERE p.player_name IN (SELECT name FROM @Names)
GROUP BY p.player_name;
