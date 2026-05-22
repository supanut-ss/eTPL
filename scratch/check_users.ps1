$connectionString = "Server=94.237.76.153;Database=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True"
$sql = "SELECT DISTINCT user_level FROM tbm_user"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $sql | ConvertTo-Json
