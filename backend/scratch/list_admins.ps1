$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT id, user_id, user_level, line_name FROM tbm_user WHERE user_level IN ('admin', 'moderator')"
    $dt = New-Object System.Data.DataTable
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $adapter.Fill($dt) | Out-Null
    
    Write-Output "Admin/Moderator Users:"
    foreach ($row in $dt.Rows) {
        Write-Output ("ID: {0} | Username: {1} | Level: {2} | LineName: {3}" -f $row["id"], $row["user_id"], $row["user_level"], $row["line_name"])
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
