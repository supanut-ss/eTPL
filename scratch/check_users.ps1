$connectionString = "Server=128.199.70.93;Database=thaipes_etpl;User Id=thaipes_etpl;Password=Soulmate@2108;TrustServerCertificate=True"
$sql = "SELECT DISTINCT user_level FROM tbm_user"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $sql | ConvertTo-Json
