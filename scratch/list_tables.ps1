$connectionString = "Server=94.237.76.153;Database=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True"
$sql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $sql | ConvertTo-Json
