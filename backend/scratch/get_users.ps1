$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;MultipleActiveResultSets=True;TrustServerCertificate=True;Connect Timeout=15;"

try {
    [void][System.Reflection.Assembly]::LoadWithPartialName("System.Data")
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT user_id, user_level, line_name FROM tbm_user"
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dtUsers = New-Object System.Data.DataTable
    [void]$adapter.Fill($dtUsers)

    Write-Host "--- Users and Levels ---"
    foreach ($row in $dtUsers.Rows) {
        Write-Host "User ID: $($row["user_id"]) | Level: $($row["user_level"]) | Name: $($row["line_name"])"
    }

    $conn.Close()
} catch {
    Write-Error $_
}
