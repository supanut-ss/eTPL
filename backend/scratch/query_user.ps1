$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;MultipleActiveResultSets=True;TrustServerCertificate=True;Connect Timeout=15;"

try {
    [void][System.Reflection.Assembly]::LoadWithPartialName("System.Data")
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT * FROM tbm_current_season"
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dtSeason = New-Object System.Data.DataTable
    [void]$adapter.Fill($dtSeason)

    Write-Host "--- Current Seasons ---"
    foreach ($row in $dtSeason.Rows) {
        Write-Host "Platform: $($row["platform"]) | Season: $($row["season"])"
    }

    $conn.Close()
} catch {
    Write-Error $_
}
