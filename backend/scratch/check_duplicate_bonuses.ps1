$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;MultipleActiveResultSets=True;TrustServerCertificate=True;Connect Timeout=15;"

try {
    [void][System.Reflection.Assembly]::LoadWithPartialName("System.Data")
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
        SELECT t.UserId, u.user_id, u.line_name, t.Description, COUNT(*) as Count, SUM(t.Amount) as TotalAmount
        FROM tbs_auction_transactions t
        LEFT JOIN tbm_user u ON t.UserId = u.id
        WHERE t.Type = 'BONUS' AND t.Description LIKE '%Match Bonus%'
        GROUP BY t.UserId, u.user_id, u.line_name, t.Description
        HAVING COUNT(*) > 1
        ORDER BY Count DESC
"@
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    [void]$adapter.Fill($dt)

    Write-Host "--- Duplicate Match Bonuses Found ---"
    if ($dt.Rows.Count -eq 0) {
        Write-Host "No duplicate Match Bonus transactions found in the database."
    } else {
        foreach ($row in $dt.Rows) {
            Write-Host "User: $($row["user_id"]) ($($row["line_name"])) | UserId: $($row["UserId"]) | Count: $($row["Count"]) | Total TP: $($row["TotalAmount"]) | Desc: $($row["Description"])"
        }
    }

    $conn.Close()
} catch {
    Write-Error $_
}
