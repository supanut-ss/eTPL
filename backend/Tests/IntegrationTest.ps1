$baseUrl = "http://localhost:5000/api"

function Get-Token($userId, $password) {
    $body = @{ userId = $userId; password = $password } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $response.data.token
}

function Log($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" }

function Safe-Invoke($uri, $headers, $method = "Get", $body = $null) {
    try {
        if ($method -eq "Get") {
            return Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
        } else {
            return Invoke-RestMethod -Uri $uri -Method $method -Body $body -Headers $headers -ContentType "application/json"
        }
    } catch {
        $errorBody = $_.Exception.Message
        try {
            $streamReader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $streamReader.ReadToEnd()
        } catch {}
        Write-Host "API ERROR ($uri): $errorBody" -ForegroundColor Red
        return $null
    }
}

Log "--- Authenticating ---"
$adminToken = Get-Token "admin" "@dmin"
$userToken = Get-Token "tle_berlin" "33333"

$adminHeaders = @{ Authorization = "Bearer $adminToken" }
$userHeaders = @{ Authorization = "Bearer $userToken" }

# Case 1 & 2: Auction Mbappe (110718)
Log "`n--- Case 1 & 2: Auction Mbappe (Exact Increment) ---"
$playerId = 110718
$auction = Safe-Invoke -Uri "$baseUrl/auction/start/$playerId" -Method Post -Headers $adminHeaders
if ($auction) {
    $auctionId = $auction.data.data.auctionId
    $startPrice = $auction.data.data.currentPrice
    Log "Admin started auction for Mbappe: ID $auctionId (Price: $startPrice)"
    
    $nextBid = $startPrice + 1
    $bidData1 = @{ bidAmount = $nextBid } | ConvertTo-Json
    $bid = Safe-Invoke -Uri "$baseUrl/auction/$auctionId/bid/normal" -Method Post -Body $bidData1 -Headers $userHeaders
    if ($bid) { Log "TLE_BERLIN Bids $($nextBid): Successful" }
}

# CASE 6: Budget Lock (Acceptance Phase)
Log "`n--- Case 6: Budget Lock (Trigger at Acceptance) ---"
# Rodri (65)
$listRes = Safe-Invoke -Uri "$baseUrl/auction/transfer/list" -Method Post -Body (@{ squadId = 65; listingPrice = 50000 } | ConvertTo-Json) -Headers $adminHeaders
Log "Admin listed Rodri: Status=$($listRes.success)"

$offerAmount = 999950  # Leaves 50 TP for TLE_BERLIN (ID 21)
$offerData = @{ squadId = 65; amount = $offerAmount; offerType = "Transfer" } | ConvertTo-Json
$res = Safe-Invoke -Uri "$baseUrl/auction/transfer/offers" -Method Post -Body $offerData -Headers $userHeaders
if ($res) {
    $offerId = if ($res.data.data) { $res.data.data.offerId } else { $res.data.offerId }
    Log "TLE_BERLIN made offer for Rodri: ID $offerId, Status=$($res.data.data.status)"
    
    # ADMIN ACCEPTS -> Should fail due to Buyer's Budget Lock
    $respondData = @{ accept = $true } | ConvertTo-Json
    $acceptRes = Safe-Invoke -Uri "$baseUrl/auction/transfer/offers/$offerId/respond" -Method Post -Body $respondData -Headers $adminHeaders
    if ($null -eq $acceptRes) {
        Log "Budget Lock Triggered SUCCESSFULLY during Acceptance!"
    }
}

# CASE 9: Loan Luka Modric (64)
Log "`n--- Case 9: Loan Cycle ---"
$loanOfferData = @{ squadId = 64; amount = 500; offerType = "Loan"; loanExpiry = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ssZ") } | ConvertTo-Json
$loanRes = Safe-Invoke -Uri "$baseUrl/auction/transfer/offers" -Method Post -Body $loanOfferData -Headers $userHeaders
if ($loanRes) {
    $offerId = if ($loanRes.data.data) { $loanRes.data.data.offerId } else { $loanRes.data.offerId }
    Log "TLE_BERLIN made Loan offer for Modric: ID $offerId"
    
    $respondData = @{ accept = $true } | ConvertTo-Json
    $acceptRes = Safe-Invoke -Uri "$baseUrl/auction/transfer/offers/$offerId/respond" -Method Post -Body $respondData -Headers $adminHeaders
    if ($acceptRes) { Log "Admin Accepted Loan: Success!" }
}

# Final Check
Log "`n--- 🏁 Final Verification 🏁 ---"
$mySquad = Safe-Invoke -Uri "$baseUrl/auction/my-squad" -Headers $adminHeaders
$modric = $mySquad.data | Where-Object { $_.playerId -eq 34098 }
Log "Modric Status in Admin Squad: $($modric.status)"

Log "`n--- Test Script Execution Completed ---"
