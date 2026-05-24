$connString = "Data Source=94.237.76.153;Initial Catalog=thaipes_etpl;User Id=thaipes_dba;Password=Soulmate@2108;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)

try {
    $conn.Open()
    
    # 1. Fetch all users
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT id, user_id, current_team FROM tbm_user"
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dtUsers = New-Object System.Data.DataTable
    $adapter.Fill($dtUsers) | Out-Null
    
    $users = @{}
    foreach ($row in $dtUsers.Rows) {
        $users[[int]$row["id"]] = @{
            Username = $row["user_id"]
            Team = $row["current_team"]
        }
    }
    
    # 2. Fetch all wallets
    $cmd.CommandText = "SELECT UserId, AvailableBalance, ReservedBalance FROM tbs_auction_user_wallet"
    $dtWallets = New-Object System.Data.DataTable
    $adapter.Fill($dtWallets) | Out-Null
    
    $wallets = @{}
    foreach ($row in $dtWallets.Rows) {
        $wallets[[int]$row["UserId"]] = @{
            AvailableBalance = [int]$row["AvailableBalance"]
            ReservedBalance = [int]$row["ReservedBalance"]
        }
    }
    
    # 3. Fetch all active auctions (DbStatus = 'Active')
    $cmd.CommandText = "SELECT auction_id, PlayerId, HighestBidderId, CurrentPrice FROM tbs_auction_board WHERE DbStatus = 'Active'"
    $dtActiveAuctions = New-Object System.Data.DataTable
    $adapter.Fill($dtActiveAuctions) | Out-Null
    
    # 4. Fetch final bids for active auctions
    $cmd.CommandText = "SELECT AuctionId, UserId, BidAmount FROM tbs_auction_bid_log WHERE Phase = 'Final'"
    $dtFinalBids = New-Object System.Data.DataTable
    $adapter.Fill($dtFinalBids) | Out-Null
    
    # 5. Fetch transactions to check last BalanceAfter and calculate expected AvailableBalance
    # We will fetch all transactions sorted by CreatedAt and transaction_id
    $cmd.CommandText = "SELECT UserId, Amount, Direction, Type, BalanceAfter, CreatedAt, transaction_id FROM tbs_auction_transactions ORDER BY UserId, CreatedAt ASC, transaction_id ASC"
    $dtTxs = New-Object System.Data.DataTable
    $adapter.Fill($dtTxs) | Out-Null
    
    # Process transactions by user to calculate transaction-based expected AvailableBalance
    # and find the last transaction's BalanceAfter
    $txSummary = @{}
    foreach ($row in $dtTxs.Rows) {
        $userId = [int]$row["UserId"]
        if (-not $txSummary.ContainsKey($userId)) {
            $txSummary[$userId] = @{
                LastBalanceAfter = $null
                CalculatedBalance = 1930 # Default starting budget
                TxCount = 0
                Txs = @()
            }
        }
        
        $amt = [int]$row["Amount"]
        $dir = $row["Direction"]
        $type = $row["Type"]
        $balAfter = [int]$row["BalanceAfter"]
        
        $txSummary[$userId].LastBalanceAfter = $balAfter
        $txSummary[$userId].TxCount++
        $txSummary[$userId].Txs += $row
        
        # Apply change to calculated balance
        # Note: AUCTION_WIN does not affect AvailableBalance because it was already debited as AUCTION_BID
        if ($type -eq "AUCTION_WIN") {
            # No change to AvailableBalance
        } elseif ($dir -eq "DEBIT") {
            $txSummary[$userId].CalculatedBalance -= $amt
        } elseif ($dir -eq "CREDIT") {
            $txSummary[$userId].CalculatedBalance += $amt
        }
    }
    
    # 6. Calculate expected ReservedBalance for active bids
    # For each active auction, find what is currently reserved for each user:
    # A user has reserved money in an active auction if:
    # - They are the highest bidder in normal phase (HighestBidderId == user, CurrentPrice is reserved)
    # - OR they have a seal final bid.
    # Let's inspect how the code handles final bid reservations:
    # If the user is already HighestBidderId, actualDeduction = bidAmount - CurrentPrice.
    # Otherwise, actualDeduction = bidAmount.
    # So their total reserved for that auction is either:
    # - Normal phase: CurrentPrice (if HighestBidderId == user)
    # - Final phase: bidAmount
    $expectedReserved = @{}
    
    # Track reserved for Normal bids first
    foreach ($auction in $dtActiveAuctions.Rows) {
        $bidderId = $auction["HighestBidderId"]
        if ($bidderId -ne [DBNull]::Value) {
            $bidderId = [int]$bidderId
            $price = [int]$auction["CurrentPrice"]
            if (-not $expectedReserved.ContainsKey($bidderId)) {
                $expectedReserved[$bidderId] = 0
            }
            $expectedReserved[$bidderId] += $price
        }
    }
    
    # Track reserved for Final bids
    # Note: If a user has a final bid, their reservation is updated.
    # Let's check:
    # If a user placed a final bid, the code does:
    # actualDeduction = bidAmount; if (auction.HighestBidderId == userId) { actualDeduction = bidAmount - auction.CurrentPrice; }
    # So the total reserved for this user for this auction becomes exactly bidAmount!
    # Because they had CurrentPrice reserved from Normal bid, and then added (bidAmount - CurrentPrice), so total is bidAmount.
    # If they were not the highest bidder in Normal bid, they had 0 reserved, and now they add bidAmount, so total is bidAmount.
    # So if there is a Final bid for a user in an active auction, their total reservation for that auction is indeed exactly bidAmount!
    # Let's find all final bids for active auctions.
    $activeAuctionIds = @{}
    foreach ($auction in $dtActiveAuctions.Rows) {
        $activeAuctionIds[[int]$auction["auction_id"]] = $auction
    }
    
    # Group final bids by (AuctionId, UserId) and keep the latest/highest just in case
    $userFinalBidsInActive = @{}
    foreach ($fb in $dtFinalBids.Rows) {
        $auctionId = [int]$fb["AuctionId"]
        $userId = [int]$fb["UserId"]
        if ($activeAuctionIds.ContainsKey($auctionId)) {
            $amt = [int]$fb["BidAmount"]
            $key = "$auctionId-$userId"
            if (-not $userFinalBidsInActive.ContainsKey($key) -or $userFinalBidsInActive[$key] -lt $amt) {
                $userFinalBidsInActive[$key] = $amt
            }
        }
    }
    
    # Update expected reserved based on final bids:
    # For any user who placed a final bid, their reservation for that auction is the final bid amount instead of the normal bid amount.
    foreach ($key in $userFinalBidsInActive.Keys) {
        $parts = $key.Split('-')
        $auctionId = [int]$parts[0]
        $userId = [int]$parts[1]
        $finalAmt = $userFinalBidsInActive[$key]
        
        $auction = $activeAuctionIds[$auctionId]
        $normalBidderId = $auction["HighestBidderId"]
        
        # Deduct normal reservation from this user for this auction (if they were the normal bidder)
        # because the final bid overrides/adds to it.
        $normalReservedForThisUser = 0
        if ($normalBidderId -ne [DBNull]::Value -and [int]$normalBidderId -eq $userId) {
            $normalReservedForThisUser = [int]$auction["CurrentPrice"]
        }
        
        $currentVal = 0
        if ($expectedReserved.ContainsKey($userId)) {
            $currentVal = $expectedReserved[$userId]
        }
        
        $expectedReserved[$userId] = $currentVal - $normalReservedForThisUser + $finalAmt
    }
    
    # Print header
    Write-Host "==========================================================================" -ForegroundColor Yellow
    Write-Host "                   TP WALLET AUDIT REPORT (eTPL SYSTEM)                   " -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Yellow
    
    $discrepancyCount = 0
    
    foreach ($userId in $users.Keys) {
        $username = $users[$userId].Username
        $team = $users[$userId].Team
        
        $wallet = $wallets[$userId]
        if ($null -eq $wallet) {
            Write-Host "User $username (ID: $userId, Team: $team) - NO WALLET FOUND!" -ForegroundColor Red
            $discrepancyCount++
            continue
        }
        
        $avail = $wallet.AvailableBalance
        $res = $wallet.ReservedBalance
        
        # Compare with last transaction BalanceAfter
        $txInfo = $txSummary[$userId]
        $expectedAvail = 1930
        $lastBalAfter = 1930
        $txCount = 0
        if ($null -ne $txInfo) {
            $expectedAvail = $txInfo.CalculatedBalance
            $lastBalAfter = $txInfo.LastBalanceAfter
            $txCount = $txInfo.TxCount
        }
        
        $expectedRes = 0
        if ($expectedReserved.ContainsKey($userId)) {
            $expectedRes = $expectedReserved[$userId]
        }
        
        # Check discrepancies
        $hasDiscrepancy = $false
        $reasons = @()
        
        if ($avail -ne $lastBalAfter) {
            $hasDiscrepancy = $true
            $reasons += "AvailableBalance ($avail) does not match Last Transaction BalanceAfter ($lastBalAfter)"
        }
        
        if ($avail -ne $expectedAvail) {
            $hasDiscrepancy = $true
            $reasons += "AvailableBalance ($avail) does not match Transaction-calculated Expected Balance ($expectedAvail)"
        }
        
        if ($res -ne $expectedRes) {
            $hasDiscrepancy = $true
            $reasons += "ReservedBalance ($res) does not match Calculated Active Bids ($expectedRes)"
        }
        
        if ($hasDiscrepancy) {
            $discrepancyCount++
            Write-Host "User: $username (ID: $userId, Team: $team)" -ForegroundColor Red
            Write-Host "  [Wallet]    Available: $avail | Reserved: $res" -ForegroundColor Red
            Write-Host "  [Expected]  Available: $expectedAvail (Last Tx Bal: $lastBalAfter) | Reserved: $expectedRes" -ForegroundColor Green
            Write-Host "  [Txs Count] $txCount" -ForegroundColor Gray
            Write-Host "  [Issues]:" -ForegroundColor Yellow
            foreach ($r in $reasons) {
                Write-Host "    - $r" -ForegroundColor Yellow
            }
            Write-Host "--------------------------------------------------------------------------" -ForegroundColor DarkGray
        }
    }
    
    if ($discrepancyCount -eq 0) {
        Write-Host "SUCCESS: No discrepancies found. All user wallets are perfectly balanced!" -ForegroundColor Green
    } else {
        Write-Host "FOUND: $discrepancyCount users with wallet discrepancies/issues." -ForegroundColor Red
    }
    
} catch {
    Write-Error $_.Exception.Message
} finally {
    $conn.Close()
}
