$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    Write-Output "Opening connection..."
    $conn.Open()
    Write-Output "Connection opened! Querying tbm_permission..."
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COUNT(*) FROM tbm_permission"
    $count = $cmd.ExecuteScalar()
    Write-Output "Count of permissions: $count"
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
    Write-Output "Connection closed."
}
