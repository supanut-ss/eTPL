$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;MultipleActiveResultSets=True;TrustServerCertificate=True;Connect Timeout=15;"

try {
    [void][System.Reflection.Assembly]::LoadWithPartialName("System.Data")
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT id, name, description, format, status, is_public, created_by FROM tbs_special_tournament"
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    [void]$adapter.Fill($dt)

    Write-Host "Row count: $($dt.Rows.Count)"
    $dt | Format-Table -AutoSize

    $conn.Close()
} catch {
    Write-Error $_
}
