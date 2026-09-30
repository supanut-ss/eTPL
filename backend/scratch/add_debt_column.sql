/* Run this BEFORE deploying the new backend code (which reads/writes DebtAmount),
   otherwise EF Core will error trying to map a column that doesn't exist yet. */

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.tbs_auction_user_wallet') AND name = 'DebtAmount'
)
BEGIN
    ALTER TABLE dbo.tbs_auction_user_wallet ADD DebtAmount INT NOT NULL DEFAULT 0;
END

SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tbs_auction_user_wallet') AND name = 'DebtAmount';
