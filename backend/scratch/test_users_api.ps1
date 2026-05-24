$loginUrl = "http://localhost:5000/api/auth/login"
$usersUrl = "http://localhost:5000/api/admin/users"

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
        
        Write-Output "Querying users API from $usersUrl..."
        $usersRes = Invoke-WebRequest -Uri $usersUrl -Method Get -Headers $headers
        Write-Output "HTTP Status: $($usersRes.StatusCode)"
        Write-Output "Response Content (Truncated):"
        $content = $usersRes.Content
        if ($content.Length -gt 500) {
            Write-Output $content.Substring(0, 500)
            Write-Output "... (truncated)"
        } else {
            Write-Output $content
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
