-- Run this SQL in SQL Server Management Studio to create the test table
-- (Same structure as tbm_fixture_all)

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbm_fixture_all_test' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    SELECT TOP 0 * INTO [dbo].[tbm_fixture_all_test] FROM [dbo].[tbm_fixture_all]
    PRINT 'Table tbm_fixture_all_test created successfully'
END
ELSE
BEGIN
    PRINT 'Table tbm_fixture_all_test already exists'
END
