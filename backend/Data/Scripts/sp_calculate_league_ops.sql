CREATE OR ALTER PROCEDURE sp_calculate_league_ops
    @in_int_cycle_id INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Internal variables
    DECLARE @v_int_match_target INT;
    DECLARE @v_int_total_days INT;
    DECLARE @v_dec_bonus_pool DECIMAL(18,2);
    DECLARE @v_int_threshold INT;

    -- Get cycle config
    SELECT 
        @v_int_match_target = match_target,
        @v_int_total_days = DATEDIFF(DAY, start_date, end_date) + 1,
        @v_dec_bonus_pool = bonus_pool,
        @v_int_threshold = ei_threshold
    FROM league_cycles 
    WHERE id = @in_int_cycle_id;

    -- Temporary table to hold results
    CREATE TABLE #PlayerStats (
        user_id VARCHAR(50),
        played_count INT,
        ready_days INT,
        p_score DECIMAL(18,4),
        r_score DECIMAL(18,4),
        ei_score DECIMAL(18,4),
        tier VARCHAR(20),
        multiplier INT,
        est_bonus DECIMAL(18,2)
    );

    -- Calculate P and R for each player
    INSERT INTO #PlayerStats (user_id, played_count, ready_days)
    SELECT 
        u.UserId,
        (SELECT COUNT(*) FROM TbmFixtureAll f 
         WHERE (f.Home = u.UserId OR f.Away = u.UserId) 
         AND f.HomeScore IS NOT NULL AND f.AwayScore IS NOT NULL
         AND f.MatchDate BETWEEN (SELECT start_date FROM league_cycles WHERE id = @in_int_cycle_id) 
                         AND (SELECT end_date FROM league_cycles WHERE id = @in_int_cycle_id)),
        (SELECT COUNT(*) FROM daily_checkins c 
         WHERE c.user_id = u.UserId AND c.cycle_id = @in_int_cycle_id AND c.is_ready = 1)
    FROM TbmUser u;

    -- Calculate EI and Tiers
    UPDATE #PlayerStats
    SET 
        p_score = (CAST(played_count AS DECIMAL(18,4)) / @v_int_match_target) * 100,
        r_score = (CAST(ready_days AS DECIMAL(18,4)) / @v_int_total_days) * 100;

    UPDATE #PlayerStats
    SET ei_score = (p_score * 0.7) + (r_score * 0.3);

    -- Assign Tiers and Multipliers based on cycle config
    UPDATE ps
    SET 
        ps.tier = CASE 
            WHEN ps.ei_score >= 95 THEN 'Elite'
            WHEN ps.ei_score >= 80 THEN 'Active'
            WHEN ps.ei_score >= 60 THEN 'Warning'
            ELSE 'Inactive'
        END,
        ps.multiplier = CASE 
            WHEN ps.ei_score >= 95 THEN lc.rate_elite
            WHEN ps.ei_score >= 80 THEN lc.rate_active
            WHEN ps.ei_score >= 60 THEN lc.rate_warning
            ELSE lc.rate_inactive
        END
    FROM #PlayerStats ps
    CROSS JOIN league_cycles lc
    WHERE lc.id = @in_int_cycle_id;

    -- Calculate Bonus (Simplistic share based on multipliers)
    DECLARE @v_dec_total_multipliers INT;
    SELECT @v_dec_total_multipliers = SUM(multiplier) FROM #PlayerStats;

    IF @v_dec_total_multipliers > 0
    BEGIN
        UPDATE #PlayerStats
        SET est_bonus = (CAST(multiplier AS DECIMAL(18,2)) / @v_dec_total_multipliers) * @v_dec_bonus_pool;
    END

    -- Return stats
    SELECT * FROM #PlayerStats ORDER BY ei_score DESC;

    DROP TABLE #PlayerStats;
END
