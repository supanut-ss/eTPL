$connectionString = "Server=128.199.70.93;Database=thaipes_etpl;User Id=thaipes_etpl;Password=Soulmate@2108;TrustServerCertificate=True"
$sql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $sql | ConvertTo-Json
