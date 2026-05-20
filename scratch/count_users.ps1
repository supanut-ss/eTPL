$connectionString = "Server=128.199.70.93;Database=thaipes_etpl;User Id=thaipes_etpl;Password=Soulmate@2108;TrustServerCertificate=True"
$sql = "SELECT COUNT(*) AS UserCount FROM tbm_user WHERE user_level <> 'admin'"
Invoke-Sqlcmd -ConnectionString $connectionString -Query $sql | ConvertTo-Json
