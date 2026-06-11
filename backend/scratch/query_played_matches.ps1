$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;MultipleActiveResultSets=True;TrustServerCertificate=True;Connect Timeout=15;"

try {
    [void][System.Reflection.Assembly]::LoadWithPartialName("System.Data")
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT TOP 10 fixture_id, division, match, home, home_score, away_score, away, active FROM tbm_fixture_all WHERE home_score IS NOT NULL"
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dtMatches = New-Object System.Data.DataTable
    [void]$adapter.Fill($dtMatches)

    Write-Host "--- Played Matches in DB ---"
    foreach ($row in $dtMatches.Rows) {
        Write-Host "FixtureId: $($row["fixture_id"]) | Div: $($row["division"]) | Match: $($row["match"]) | Home: $($row["home"]) ($($row["home_score"])) vs Away: $($row["away"]) ($($row["away_score"]))"
    }

    $conn.Close()
} catch {
    Write-Error $_
}
