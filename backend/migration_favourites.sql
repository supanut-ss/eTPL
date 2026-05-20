BEGIN TRANSACTION;
GO

ALTER TABLE [dbo].[tbs_auction_user_wallet] ADD [RowVersion] rowversion NOT NULL;
GO

CREATE TABLE [dbo].[tbs_auction_favourites] (
    [id] int NOT NULL IDENTITY,
    [UserId] int NOT NULL,
    [PlayerId] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_tbs_auction_favourites] PRIMARY KEY ([id]),
    CONSTRAINT [FK_tbs_auction_favourites_pes_player_team_PlayerId] FOREIGN KEY ([PlayerId]) REFERENCES [dbo].[pes_player_team] ([id_player]) ON DELETE CASCADE,
    CONSTRAINT [FK_tbs_auction_favourites_tbm_user_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[tbm_user] ([id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_tbs_auction_favourites_PlayerId] ON [dbo].[tbs_auction_favourites] ([PlayerId]);
GO

CREATE UNIQUE INDEX [IX_tbs_auction_favourites_UserId_PlayerId] ON [dbo].[tbs_auction_favourites] ([UserId], [PlayerId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260520103912_AddAuctionFavourites', N'8.0.0');
GO

COMMIT;
GO

