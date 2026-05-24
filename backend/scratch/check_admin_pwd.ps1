$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT user_id, password FROM tbm_user WHERE user_id = 'admin'"
    $r = $cmd.ExecuteReader()
    if ($r.Read()) {
        Write-Output ("Admin UserId: {0}" -f $r["user_id"])
        Write-Output ("Admin Password: {0}" -f $r["password"])
    }
    $r.Close()
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
