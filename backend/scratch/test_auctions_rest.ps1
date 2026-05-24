$loginUrl = "http://localhost:5000/api/auth/login"
$auctionsUrl = "http://localhost:5000/api/admin/auctions"

$body = @{
    UserId = "admin"
    Password = "@dmin"
} | ConvertTo-Json

try {
    Write-Output "Attempting to login to $loginUrl..."
    $loginRes = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $body -ContentType "application/json"
    
    if ($loginRes.success) {
        $token = $loginRes.data.token
        Write-Output "Login successful! Token acquired."
        
        $headers = @{
            Authorization = "Bearer $token"
        }
        
        Write-Output "Querying auctions API using Invoke-RestMethod..."
        $auctionsRes = Invoke-RestMethod -Uri $auctionsUrl -Method Get -Headers $headers
        Write-Output "Response Count: $($auctionsRes.Count)"
        if ($auctionsRes.Count -gt 0) {
            Write-Output "First item:"
            Write-Output ($auctionsRes[0] | ConvertTo-Json -Depth 5)
        }
    } else {
        Write-Error "Login failed: $($loginRes.message)"
    }
} catch {
    Write-Error $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $resp = $reader.ReadToEnd()
        Write-Error "Response body: $resp"
    }
}
