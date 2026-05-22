$connectionString = "Server=94.237.76.153;Database=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True"
$sql = "SELECT COUNT(*) AS UserCount FROM tbm_user WHERE user_level <> 'admin'"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $sql | ConvertTo-Json
