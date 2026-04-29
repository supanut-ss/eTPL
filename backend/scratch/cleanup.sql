-- 1. Revert Renewals for Seasons 37, 38, 39, 40
DECLARE @Season INT;
DECLARE season_cursor CURSOR FOR SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40;
OPEN season_cursor;
FETCH NEXT FROM season_cursor INTO @Season;
WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @Tag NVARCHAR(100) = '%(Season ' + CAST(@Season AS NVARCHAR) + ')%';
    
    -- Revert wallet balances
    UPDATE w
    SET w.AvailableBalance = w.AvailableBalance + t.Amount
    FROM dbo.tbs_auction_user_wallet w
    JOIN dbo.tbs_auction_transactions t ON w.UserId = t.UserId
    WHERE t.Type = 'RENEW_CONTRACT_AUTO' AND t.Description LIKE @Tag;

    -- Revert squad counters
    UPDATE s
    SET s.SeasonsWithTeam = CASE WHEN ISNULL(s.SeasonsWithTeam, 0) > 0 THEN s.SeasonsWithTeam - 1 ELSE 0 END
    FROM dbo.tbs_auction_squad s
    JOIN dbo.tbs_auction_transactions t ON s.UserId = t.UserId AND s.PlayerId = t.RelatedPlayerId
    WHERE t.Type = 'RENEW_CONTRACT_AUTO' AND t.Description LIKE @Tag;

    -- Delete transactions
    DELETE FROM dbo.tbs_auction_transactions WHERE Type = 'RENEW_CONTRACT_AUTO' AND Description LIKE @Tag;

    FETCH NEXT FROM season_cursor INTO @Season;
END;
CLOSE season_cursor;
DEALLOCATE season_cursor;

-- 2. Reset Season Number
UPDATE dbo.tbm_current_season SET Season = 36 WHERE Platform = 'PC';
UPDATE dbo.tbs_auction_settings SET current_season = 36;

-- 3. Delete any HOF entries from today
DELETE FROM dbo.tbs_hof WHERE Season LIKE '%Season 15%' OR Season LIKE '%Season 16%' OR Season LIKE '%Season 17%' OR Season LIKE '%Season 18%';
