-- ============================================================
-- Special Tournament System — Migration Script
-- Run once against the target database.
-- ============================================================

-- 1. tbs_special_tournament
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tbs_special_tournament' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.tbs_special_tournament (
        id                      UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        name                    NVARCHAR(200)       NOT NULL,
        description             NVARCHAR(1000)      NULL,
        format                  NVARCHAR(30)        NOT NULL DEFAULT 'knockout',   -- 'knockout' | 'group_knockout'
        status                  NVARCHAR(30)        NOT NULL DEFAULT 'draft',      -- 'draft' | 'registration' | 'ongoing' | 'completed'
        is_public               BIT                 NOT NULL DEFAULT 0,
        created_at              DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
        created_by              NVARCHAR(100)       NULL,
        group_count             INT                 NULL,
        teams_advance_per_group INT                 NULL,
        CONSTRAINT PK_special_tournament PRIMARY KEY (id)
    );
    PRINT 'Created tbs_special_tournament';
END
ELSE
    PRINT 'tbs_special_tournament already exists — skipped';
GO

-- 2. tbs_special_group
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tbs_special_group' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.tbs_special_group (
        id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        tournament_id   UNIQUEIDENTIFIER    NOT NULL,
        group_name      NVARCHAR(10)        NOT NULL,
        group_order     INT                 NOT NULL DEFAULT 0,
        CONSTRAINT PK_special_group PRIMARY KEY (id),
        CONSTRAINT FK_special_group_tournament FOREIGN KEY (tournament_id)
            REFERENCES dbo.tbs_special_tournament (id) ON DELETE CASCADE
    );
    CREATE INDEX IX_special_group_tournament ON dbo.tbs_special_group (tournament_id);
    PRINT 'Created tbs_special_group';
END
ELSE
    PRINT 'tbs_special_group already exists — skipped';
GO

-- 3. tbs_special_participant
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tbs_special_participant' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.tbs_special_participant (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        tournament_id       UNIQUEIDENTIFIER    NOT NULL,
        display_name        NVARCHAR(200)       NOT NULL,
        team_name           NVARCHAR(200)       NULL,
        logo_url            NVARCHAR(500)       NULL,
        seed                INT                 NULL,
        group_id            UNIQUEIDENTIFIER    NULL,
        is_eliminated       BIT                 NOT NULL DEFAULT 0,
        registration_order  INT                 NOT NULL DEFAULT 0,
        CONSTRAINT PK_special_participant PRIMARY KEY (id),
        CONSTRAINT FK_special_participant_tournament FOREIGN KEY (tournament_id)
            REFERENCES dbo.tbs_special_tournament (id) ON DELETE CASCADE,
        CONSTRAINT FK_special_participant_group FOREIGN KEY (group_id)
            REFERENCES dbo.tbs_special_group (id) ON DELETE SET NULL
    );
    CREATE INDEX IX_special_participant_tournament ON dbo.tbs_special_participant (tournament_id);
    CREATE INDEX IX_special_participant_group ON dbo.tbs_special_participant (group_id);
    PRINT 'Created tbs_special_participant';
END
ELSE
    PRINT 'tbs_special_participant already exists — skipped';
GO

-- 4. tbs_special_match
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tbs_special_match' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.tbs_special_match (
        id                      UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        tournament_id           UNIQUEIDENTIFIER    NOT NULL,
        phase                   NVARCHAR(20)        NOT NULL DEFAULT 'knockout',   -- 'group' | 'knockout'
        group_id                UNIQUEIDENTIFIER    NULL,
        round                   INT                 NOT NULL,
        match_no                INT                 NOT NULL,
        home_participant_id     UNIQUEIDENTIFIER    NULL,
        away_participant_id     UNIQUEIDENTIFIER    NULL,
        home_score              INT                 NULL,
        away_score              INT                 NULL,
        is_played               BIT                 NOT NULL DEFAULT 0,
        is_bye                  BIT                 NOT NULL DEFAULT 0,
        next_match_id           UNIQUEIDENTIFIER    NULL,
        winner_id               UNIQUEIDENTIFIER    NULL,
        CONSTRAINT PK_special_match PRIMARY KEY (id),
        CONSTRAINT FK_special_match_tournament FOREIGN KEY (tournament_id)
            REFERENCES dbo.tbs_special_tournament (id) ON DELETE CASCADE,
        CONSTRAINT FK_special_match_group FOREIGN KEY (group_id)
            REFERENCES dbo.tbs_special_group (id) ON DELETE SET NULL
    );
    CREATE INDEX IX_special_match_tournament ON dbo.tbs_special_match (tournament_id);
    CREATE INDEX IX_special_match_group ON dbo.tbs_special_match (group_id);
    PRINT 'Created tbs_special_match';
END
ELSE
    PRINT 'tbs_special_match already exists — skipped';
GO

PRINT '=== Special Tournament migration complete ===';
GO
