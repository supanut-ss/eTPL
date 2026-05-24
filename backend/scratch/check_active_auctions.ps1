$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT DbStatus, COUNT(*) as Count FROM tbs_auction_board GROUP BY DbStatus"
    $dt = New-Object System.Data.DataTable
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $adapter.Fill($dt) | Out-Null
    
    Write-Output "Auction Board Summary:"
    foreach ($row in $dt.Rows) {
        Write-Output ("Status: {0} | Count: {1}" -f $row["DbStatus"], $row["Count"])
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
