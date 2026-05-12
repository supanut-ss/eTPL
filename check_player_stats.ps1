$connectionString = "Server=128.199.70.93;Database=thaipes_etpl;User Id=thaipes_etpl;Password=Soulmate@2108;TrustServerCertificate=True"
$sql = "SELECT user_id, r_score, ei_score FROM (EXEC sp_calculate_league_ops @in_int_cycle_id=1) as stats WHERE user_id LIKE '%NONNING%' OR user_id LIKE '%DKGXFT%'"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $sql | ConvertTo-Json
