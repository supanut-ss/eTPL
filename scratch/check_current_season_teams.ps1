$connectionString = "Server=94.237.76.153;Database=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True"
$seasonSql = "SELECT [season] FROM [thaipes_etpl].[dbo].[tbm_current_season] WHERE [platform] = 'PC'"
$seasonObj = Invoke-Sqlcmd -ConnectionString $connectionString -Query $seasonSql
$season = $seasonObj.season

Write-Output "Current Season: $season"

$teamsSql = "SELECT COUNT(*) AS CurrentTeamsCount FROM [thaipes_etpl].[dbo].[tbm_team] WHERE [season] = $season"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $teamsSql | ConvertTo-Json

$playersSql = "SELECT COUNT(*) AS TotalPlayersCount FROM [thaipes_etpl].[dbo].[tbm_user] WHERE [user_level] <> 'admin'"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $playersSql | ConvertTo-Json
