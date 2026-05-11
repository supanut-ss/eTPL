-- 1. Table: dbo.tbs_league_cycles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbs_league_cycles' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.tbs_league_cycles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cycle_name VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        match_start_no INT DEFAULT 0,
        match_end_no INT DEFAULT 0,
        match_target INT DEFAULT 12,
        bonus_pool DECIMAL(18, 2) DEFAULT 0,
        ei_threshold INT DEFAULT 15,
        rate_elite INT DEFAULT 100,
        rate_active INT DEFAULT 70,
        rate_warning INT DEFAULT 30,
        rate_inactive INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active' -- 'active', 'completed'
    );
END
ELSE
BEGIN
    -- Check for missing columns in existing table
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_league_cycles') AND name = 'match_start_no')
    BEGIN
        ALTER TABLE dbo.tbs_league_cycles ADD match_start_no INT DEFAULT 0;
    END
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_league_cycles') AND name = 'match_end_no')
    BEGIN
        ALTER TABLE dbo.tbs_league_cycles ADD match_end_no INT DEFAULT 0;
    END
END

-- 2. Table: dbo.tbs_daily_checkins
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbs_daily_checkins' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.tbs_daily_checkins (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cycle_id INT NOT NULL,
        user_id VARCHAR(50) NOT NULL, -- Link to TbmUser.UserId
        checkin_date DATE NOT NULL,
        is_ready BIT DEFAULT 1,
        CONSTRAINT FK_Checkins_Cycle FOREIGN KEY (cycle_id) REFERENCES dbo.tbs_league_cycles(id)
    );
END
