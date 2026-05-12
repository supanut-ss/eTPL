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
    DECLARE @v_int_match_start INT;
    DECLARE @v_int_match_end INT;

    -- Get cycle config
    SELECT 
        @v_int_match_target = match_target,
        @v_int_total_days = DATEDIFF(DAY, start_date, end_date) + 1,
        @v_dec_bonus_pool = bonus_pool,
        @v_int_threshold = ei_threshold,
        @v_int_match_start = match_start_no,
        @v_int_match_end = match_end_no
    FROM tbs_league_cycles 
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

    -- Calculate P and R for each player (Only for players who have matches in this cycle range)
    INSERT INTO #PlayerStats (user_id, played_count, ready_days)
    SELECT 
        u.user_id,
        (SELECT COUNT(*) FROM tbm_fixture_all f 
         WHERE (UPPER(f.HOME) = UPPER(u.user_id) OR UPPER(f.AWAY) = UPPER(u.user_id)) 
         AND f.MATCH_DATE IS NOT NULL
         AND f.HOME_SCORE IS NOT NULL AND f.AWAY_SCORE IS NOT NULL
         AND f.MATCH BETWEEN @v_int_match_start AND @v_int_match_end),
        (SELECT COUNT(*) FROM tbs_daily_checkins c 
         WHERE c.user_id = u.user_id AND c.cycle_id = @in_int_cycle_id AND c.is_ready = 1)
    FROM tbm_user u
    WHERE EXISTS (
        SELECT 1 FROM tbm_fixture_all f 
        WHERE (UPPER(f.HOME) = UPPER(u.user_id) OR UPPER(f.AWAY) = UPPER(u.user_id))
        AND f.MATCH BETWEEN @v_int_match_start AND @v_int_match_end
    );

    -- Calculate EI and Tiers
    UPDATE #PlayerStats
    SET 
        p_score = IIF((CAST(played_count AS DECIMAL(18,4)) / @v_int_match_target) * 100 > 100, 100, (CAST(played_count AS DECIMAL(18,4)) / @v_int_match_target) * 100),
        r_score = IIF((CAST(ready_days AS DECIMAL(18,4)) / @v_int_total_days) * 100 > 100, 100, (CAST(ready_days AS DECIMAL(18,4)) / @v_int_total_days) * 100);

    UPDATE #PlayerStats
    SET ei_score = (p_score * 0.8) + (r_score * 0.2);

    -- Assign Tiers and Multipliers based on cycle config
    UPDATE ps
    SET 
        ps.tier = CASE 
            WHEN ps.ei_score >= 80 THEN 'Elite'
            WHEN ps.ei_score >= 60 THEN 'Active'
            WHEN ps.ei_score >= 40 THEN 'Warning'
            ELSE 'Inactive'
        END,
        ps.multiplier = CASE 
            WHEN ps.ei_score >= 80 THEN lc.rate_elite
            WHEN ps.ei_score >= 60 THEN lc.rate_active
            WHEN ps.ei_score >= 40 THEN lc.rate_warning
            ELSE lc.rate_inactive
        END
    FROM #PlayerStats ps
    CROSS JOIN tbs_league_cycles lc
    WHERE lc.id = @in_int_cycle_id;

    -- Calculate Bonus (Proportional based on multipliers)
    UPDATE #PlayerStats
    SET est_bonus = (CAST(multiplier AS DECIMAL(18,2)) / 100.0) * @v_dec_bonus_pool;

    -- Return stats
    SELECT * FROM #PlayerStats ORDER BY ei_score DESC;

    DROP TABLE #PlayerStats;
END
