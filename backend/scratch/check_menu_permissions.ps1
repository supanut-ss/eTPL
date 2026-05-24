$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT user_level, can_access FROM tbm_permission WHERE menu_key = 'admin-active-auctions'"
    $dt = New-Object System.Data.DataTable
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $adapter.Fill($dt) | Out-Null
    
    Write-Output "Permissions for 'admin-active-auctions':"
    foreach ($row in $dt.Rows) {
        Write-Output ("User Level: {0} | Can Access: {1}" -f $row["user_level"], $row["can_access"])
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
