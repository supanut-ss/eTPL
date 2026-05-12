$connectionString = "Server=128.199.70.93;Database=thaipes_etpl;User Id=thaipes_etpl;Password=Soulmate@2108;TrustServerCertificate=True"
$sql = "SELECT DISTINCT user_id FROM tbl_daily_checkin WHERE user_id LIKE '%NONNING%' OR user_id LIKE '%DKGXFT%'"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $sql | ConvertTo-Json
