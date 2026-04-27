$connectionString = "Server=3.0.25.97;Database=thaipes_center;User Id=thaipes_sa;Password=Soulmate@2108;TrustServerCertificate=True"
$query = @"
BEGIN TRANSACTION;
GO

CREATE TABLE [dbo].[tbs_cup_fixture] (
    [id] uniqueidentifier NOT NULL,
    [season] int NOT NULL,
    [round] int NOT NULL,
    [match_no] int NOT NULL,
    [home_user_id] nvarchar(100) NULL,
    [away_user_id] nvarchar(100) NULL,
    [home_score] int NULL,
    [away_score] int NULL,
    [next_match_id] uniqueidentifier NULL,
    [is_played] bit NOT NULL,
    [is_bye] bit NOT NULL,
    CONSTRAINT [PK_tbs_cup_fixture] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbs_notifications')
BEGIN
    CREATE TABLE [dbo].[tbs_notifications] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [Message] nvarchar(max) NOT NULL,
        [TargetUrl] nvarchar(max) NULL,
        [IsRead] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_tbs_notifications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_tbs_notifications_tbm_user_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[tbm_user] ([id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_tbs_notifications_UserId] ON [dbo].[tbs_notifications] ([UserId]);
END
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260427084210_AddCupSystem', N'8.0.0');
GO

COMMIT;
GO
"@

Invoke-Sqlcmd -ConnectionString $connectionString -Query $query
