BEGIN TRANSACTION;
GO

-- Check if column exists in tbm_user, if not, add it
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[tbm_user]') 
    AND name = N'current_division'
)
BEGIN
    ALTER TABLE [dbo].[tbm_user] ADD [current_division] nvarchar(10) NULL;
END
GO

COMMIT;
GO
