$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;MultipleActiveResultSets=True;TrustServerCertificate=True;Connect Timeout=15;"

try {
    [void][System.Reflection.Assembly]::LoadWithPartialName("System.Data")
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
        SELECT t.UserId, u.user_id, u.line_name, t.transaction_id, t.Amount, t.Description, t.CreatedAt
        FROM tbs_auction_transactions t
        LEFT JOIN tbm_user u ON t.UserId = u.id
        WHERE t.Type = 'BONUS' AND t.Description LIKE '%Match Bonus%'
"@
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    [void]$adapter.Fill($dt)

    Write-Host "--- Total Match Bonus Transactions Found: $($dt.Rows.Count) ---"
    
    # We will group by UserId and Match Number
    $records = @()
    foreach ($row in $dt.Rows) {
        $desc = $row["Description"]
        # Match number like (Match #14) or similar
        if ($desc -match '\(Match #(\d+)\)') {
            $matchNum = $Matches[1]
        } else {
            $matchNum = "Unknown"
        }

        $records += [PSCustomObject]@{
            TransactionId = $row["transaction_id"]
            UserId = $row["UserId"]
            Username = $row["user_id"]
            LineName = $row["line_name"]
            Amount = $row["Amount"]
            Description = $desc
            MatchNum = $matchNum
            CreatedAt = $row["CreatedAt"]
        }
    }

    # Group by UserId and MatchNum
    $grouped = $records | Group-Object -Property UserId, MatchNum | Where-Object { $_.Count -gt 1 -and $_.Values[1] -ne "Unknown" }

    Write-Host "`n--- Duplicate Match Bonuses (Grouped by UserId & Match Number) ---"
    if ($grouped.Count -eq 0 -or $null -eq $grouped) {
        Write-Host "No duplicates found!"
    } else {
        foreach ($group in $grouped) {
            $first = $group.Group[0]
            Write-Host "User: $($first.Username) ($($first.LineName)) | Match #: $($first.MatchNum) | Count: $($group.Count)"
            foreach ($item in $group.Group) {
                Write-Host "  - TxID: $($item.TransactionId) | Amount: $($item.Amount) | Created: $($item.CreatedAt) | Desc: $($item.Description)"
            }
        }
    }

    $conn.Close()
} catch {
    Write-Error $_
}
