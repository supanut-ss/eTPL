$connString = "Data Source=128.199.70.93;Initial Catalog=thaipes_etpl;User Id=thaipes_etpl;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    Write-Output "--- USERS ---"
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT TOP 5 user_id, password, user_level FROM tbm_user"
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        Write-Output "User: $($reader.GetValue(0)), Pass: $($reader.GetValue(1)), Level: $($reader.GetValue(2))"
    }
    $reader.Close()

} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
