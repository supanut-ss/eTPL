using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eTPL.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateLeagueOpsStoredProcedure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Create columns on tbs_league_cycles if they don't exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_league_cycles') AND name = 'match_end_no_d2')
                BEGIN
                    ALTER TABLE dbo.tbs_league_cycles ADD match_end_no_d2 INT NOT NULL DEFAULT 0;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_league_cycles') AND name = 'match_start_no_d2')
                BEGIN
                    ALTER TABLE dbo.tbs_league_cycles ADD match_start_no_d2 INT NOT NULL DEFAULT 0;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_league_cycles') AND name = 'match_target_d2')
                BEGIN
                    ALTER TABLE dbo.tbs_league_cycles ADD match_target_d2 INT NOT NULL DEFAULT 0;
                END
            ");

            // 2. Create division column on LeagueOpsStatResults if the table exists
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sysobjects WHERE name='LeagueOpsStatResults' AND xtype='U')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.LeagueOpsStatResults') AND name = 'division')
                    BEGIN
                        ALTER TABLE dbo.LeagueOpsStatResults ADD division NVARCHAR(MAX) NULL;
                    END
                END
            ");

            // 3. Create tbs_sponsor table if it doesn't exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbs_sponsor' AND xtype='U')
                BEGIN
                    CREATE TABLE dbo.tbs_sponsor (
                        id INT IDENTITY(1,1) NOT NULL,
                        name NVARCHAR(100) NOT NULL,
                        logo NVARCHAR(250) NOT NULL,
                        tagline NVARCHAR(250) NOT NULL,
                        description NVARCHAR(1000) NOT NULL,
                        website NVARCHAR(500) NOT NULL,
                        banner_bg NVARCHAR(500) NOT NULL,
                        brand_color NVARCHAR(50) NOT NULL,
                        has_banner BIT NOT NULL,
                        display_order INT NOT NULL,
                        CONSTRAINT PK_tbs_sponsor PRIMARY KEY CLUSTERED (id ASC)
                    );
                END
            ");

            // 4. Create/Alter sp_calculate_league_ops stored procedure
            migrationBuilder.Sql(@"
CREATE OR ALTER PROCEDURE sp_calculate_league_ops
    @in_int_cycle_id INT
AS
BEGIN
    SET NOCOUNT ON;

    -- สำหรับ D1
    DECLARE @v_int_match_target_d1 INT;
    DECLARE @v_int_match_start_d1 INT;
    DECLARE @v_int_match_end_d1 INT;

    -- สำหรับ D2
    DECLARE @v_int_match_target_d2 INT;
    DECLARE @v_int_match_start_d2 INT;
    DECLARE @v_int_match_end_d2 INT;

    DECLARE @v_int_total_days INT;
    DECLARE @v_dec_bonus_pool DECIMAL(18,2);
    DECLARE @v_int_threshold INT;
    
    DECLARE @v_dt_start_date DATETIME;
    DECLARE @v_dt_end_date DATETIME;

    -- โหลดค่าคอนฟิกของรอบการแข่งขัน
    SELECT 
        @v_int_match_target_d1 = match_target,
        @v_int_match_start_d1 = match_start_no,
        @v_int_match_end_d1 = match_end_no,
        @v_int_match_target_d2 = match_target_d2,
        @v_int_match_start_d2 = match_start_no_d2,
        @v_int_match_end_d2 = match_end_no_d2,
        @v_int_total_days = DATEDIFF(DAY, start_date, end_date) + 1,
        @v_dec_bonus_pool = bonus_pool,
        @v_int_threshold = ei_threshold,
        @v_dt_start_date = start_date,
        @v_dt_end_date = end_date
    FROM tbs_league_cycles 
    WHERE id = @in_int_cycle_id;

    -- สร้างตารางชั่วคราวเก็บผลการคำนวณ
    CREATE TABLE #PlayerStats (
        user_id VARCHAR(50),
        played_count INT,
        ready_days INT,
        p_score DECIMAL(18,4),
        r_score DECIMAL(18,4),
        ei_score DECIMAL(18,4),
        tier VARCHAR(20),
        multiplier INT,
        est_bonus DECIMAL(18,2),
        division VARCHAR(10)
    );

    -- คำนวณจำนวนนัด (Played) และจำนวนวันรายงานตัว (Ready Days) แยกตาม Division ของผู้เล่น
    INSERT INTO #PlayerStats (user_id, played_count, ready_days, division)
    SELECT 
        u.user_id,
        CASE 
            WHEN UPPER(ISNULL(u.current_division, 'D1')) = 'D2' THEN
                (SELECT COUNT(*) FROM tbm_fixture_all f 
                 WHERE (UPPER(f.HOME) = UPPER(u.user_id) OR UPPER(f.AWAY) = UPPER(u.user_id)) 
                 AND f.MATCH_DATE IS NOT NULL
                 AND (f.HOME_SCORE IS NOT NULL AND f.AWAY_SCORE IS NOT NULL)
                 AND f.MATCH BETWEEN ISNULL(@v_int_match_start_d2, 0) AND ISNULL(@v_int_match_end_d2, 999999))
            ELSE
                (SELECT COUNT(*) FROM tbm_fixture_all f 
                 WHERE (UPPER(f.HOME) = UPPER(u.user_id) OR UPPER(f.AWAY) = UPPER(u.user_id)) 
                 AND f.MATCH_DATE IS NOT NULL
                 AND (f.HOME_SCORE IS NOT NULL AND f.AWAY_SCORE IS NOT NULL)
                 AND f.MATCH BETWEEN ISNULL(@v_int_match_start_d1, 0) AND ISNULL(@v_int_match_end_d1, 999999))
        END,
        (SELECT COUNT(*) FROM tbs_daily_checkins c 
         WHERE c.user_id = u.user_id 
           AND c.cycle_id = @in_int_cycle_id 
           AND c.is_ready = 1
           AND CAST(c.checkin_date AS DATE) BETWEEN CAST(@v_dt_start_date AS DATE) AND CAST(@v_dt_end_date AS DATE)),
        u.current_division
    FROM tbm_user u
    WHERE EXISTS (
        SELECT 1 FROM tbm_fixture_all f 
        WHERE (UPPER(f.HOME) = UPPER(u.user_id) OR UPPER(f.AWAY) = UPPER(u.user_id))
        AND (
            (UPPER(ISNULL(u.current_division, 'D1')) = 'D2' AND f.MATCH BETWEEN ISNULL(@v_int_match_start_d2, 0) AND ISNULL(@v_int_match_end_d2, 999999))
            OR
            (UPPER(ISNULL(u.current_division, 'D1')) != 'D2' AND f.MATCH BETWEEN ISNULL(@v_int_match_start_d1, 0) AND ISNULL(@v_int_match_end_d1, 999999))
        )
    );

    -- คำนวณ P-score (เล่นเกม) และ R-score (รายงานตัว)
    UPDATE ps
    SET 
        p_score = IIF(
            (CAST(ps.played_count AS DECIMAL(18,4)) / IIF(UPPER(ISNULL(u.current_division, 'D1')) = 'D2', @v_int_match_target_d2, @v_int_match_target_d1)) * 100 > 100, 
            100, 
            (CAST(ps.played_count AS DECIMAL(18,4)) / IIF(UPPER(ISNULL(u.current_division, 'D1')) = 'D2', @v_int_match_target_d2, @v_int_match_target_d1)) * 100
        ),
        r_score = IIF((CAST(ps.ready_days AS DECIMAL(18,4)) / @v_int_total_days) * 100 > 100, 100, (CAST(ps.ready_days AS DECIMAL(18,4)) / @v_int_total_days) * 100)
    FROM #PlayerStats ps
    JOIN tbm_user u ON UPPER(ps.user_id) = UPPER(u.user_id);

    -- คำนวณดัชนี EI (Consistency Index)
    UPDATE #PlayerStats
    SET ei_score = (p_score * 0.8) + (r_score * 0.2);

    -- กำหนดระดับ Tier และอัตราโบนัสคูณต่างๆ (Multipliers) จากการตั้งค่า
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

    -- คำนวณเงินโบนัสประมาณการ (Estimated Bonus)
    UPDATE #PlayerStats
    SET est_bonus = (CAST(multiplier AS DECIMAL(18,2)) / 100.0) * @v_dec_bonus_pool;

    -- ดึงผลลัพธ์แสดง เรียงตามคะแนน EI ลำดับจากมากไปน้อย
    SELECT * FROM #PlayerStats ORDER BY ei_score DESC;

    DROP TABLE #PlayerStats;
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Do nothing on rollback for safely added helper elements
        }
    }
}
