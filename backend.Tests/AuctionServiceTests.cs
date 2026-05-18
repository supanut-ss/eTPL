using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.Auction;
using eTPL.API.Services;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Tests
{
    public class AuctionServiceTests
    {
        private static MsSqlDbContext CreateInMemoryDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MsSqlDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;
            return new MsSqlDbContext(options);
        }

        [Fact]
        public async Task GetUserSummaryAsync_ActiveBids_CountsTowardsQuotaBeforeFinalEnd()
        {
            // Arrange
            await using var db = CreateInMemoryDb(nameof(GetUserSummaryAsync_ActiveBids_CountsTowardsQuotaBeforeFinalEnd));
            
            // Seed a user
            var userId = 10;
            db.Users.Add(new User { Id = userId, UserId = "user1" });
            db.Users.Add(new User { Id = 11, UserId = "user2" });

            // Seed auction settings
            db.AuctionSettings.Add(new AuctionSetting
            {
                MaxSquadSize = 10,
                StartingBudget = 2000,
                NormalBidDurationMinutes = 1200,
                FinalBidDurationMinutes = 240,
                DailyBidStartTime = new TimeSpan(8, 0, 0),
                DailyBidEndTime = new TimeSpan(22, 0, 0)
            });

            // Seed grade quotas (e.g. S grade: 85 - 99, max allowed: 1)
            db.AuctionGradeQuotas.Add(new AuctionGradeQuota
            {
                GradeId = 1,
                GradeName = "S",
                MinOVR = 85,
                MaxOVR = 99,
                MaxAllowedPerUser = 1
            });
            db.AuctionGradeQuotas.Add(new AuctionGradeQuota
            {
                GradeId = 2,
                GradeName = "E",
                MinOVR = 60,
                MaxOVR = 64,
                MaxAllowedPerUser = 10
            });

            // Seed two S-grade players
            var player1Id = 101;
            db.PesPlayerTeams.Add(new PesPlayerTeam { IdPlayer = player1Id, PlayerName = "Messi", PlayerOvr = 95 });
            var player2Id = 102;
            db.PesPlayerTeams.Add(new PesPlayerTeam { IdPlayer = player2Id, PlayerName = "Ronaldo", PlayerOvr = 94 });

            // Seed active auctions still in progress (now < FinalEndTime)
            // Auction 1: User is highest bidder (Leading)
            var auction1 = new AuctionBoard
            {
                AuctionId = 1,
                PlayerId = player1Id,
                HighestBidderId = userId,
                CurrentPrice = 96,
                NormalEndTime = DateTime.UtcNow.AddHours(2),
                FinalEndTime = DateTime.UtcNow.AddHours(4),
                DbStatus = "Active",
                RowVersion = new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }
            };
            db.AuctionBoards.Add(auction1);

            // Auction 2: Other user is highest bidder, but our user has a bid log (Non-leading active bid)
            var auction2 = new AuctionBoard
            {
                AuctionId = 2,
                PlayerId = player2Id,
                HighestBidderId = 11,
                CurrentPrice = 95,
                NormalEndTime = DateTime.UtcNow.AddHours(2),
                FinalEndTime = DateTime.UtcNow.AddHours(4),
                DbStatus = "Active",
                RowVersion = new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }
            };
            db.AuctionBoards.Add(auction2);

            // Add bid log for our user in Auction 2
            db.AuctionBidLogs.Add(new AuctionBidLog
            {
                AuctionId = 2,
                UserId = userId,
                BidAmount = 90,
                Phase = "Normal",
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            });

            await db.SaveChangesAsync();

            var notificationMock = new Mock<INotificationService>();
            var aiMock = new Mock<IAiService>();
            var discordMock = new Mock<IDiscordService>();

            var service = new AuctionService(db, db, notificationMock.Object, aiMock.Object, discordMock.Object);

            // Act
            var summary = await service.GetUserSummaryAsync(userId);

            // Assert
            // Both Messi (leading) and Ronaldo (non-leading but active bid) should be counted
            // because both auctions are active and the final bid round has not ended yet.
            Assert.NotNull(summary);
            Assert.Equal(2, summary.CurrentSquadCount);

            var sGradeQuota = summary.Quotas.FirstOrDefault(q => q.GradeName == "S");
            Assert.NotNull(sGradeQuota);
            Assert.Equal(2, sGradeQuota.CurrentCount); // Counts both Messi and Ronaldo
        }

        [Fact]
        public async Task GetUserSummaryAsync_ActiveBids_DoesNotCountAfterFinalEndIfLost()
        {
            // Arrange
            await using var db = CreateInMemoryDb(nameof(GetUserSummaryAsync_ActiveBids_DoesNotCountAfterFinalEndIfLost));
            
            // Seed users
            var userId = 10;
            db.Users.Add(new User { Id = userId, UserId = "user1" });
            db.Users.Add(new User { Id = 11, UserId = "user2" });

            // Seed settings
            db.AuctionSettings.Add(new AuctionSetting
            {
                MaxSquadSize = 10,
                StartingBudget = 2000,
                NormalBidDurationMinutes = 1200,
                FinalBidDurationMinutes = 240,
                DailyBidStartTime = new TimeSpan(8, 0, 0),
                DailyBidEndTime = new TimeSpan(22, 0, 0)
            });

            // Seed grade quotas (S grade)
            db.AuctionGradeQuotas.Add(new AuctionGradeQuota
            {
                GradeId = 1,
                GradeName = "S",
                MinOVR = 85,
                MaxOVR = 99,
                MaxAllowedPerUser = 1
            });
            db.AuctionGradeQuotas.Add(new AuctionGradeQuota
            {
                GradeId = 2,
                GradeName = "E",
                MinOVR = 60,
                MaxOVR = 64,
                MaxAllowedPerUser = 10
            });

            // Seed players
            var player1Id = 101;
            db.PesPlayerTeams.Add(new PesPlayerTeam { IdPlayer = player1Id, PlayerName = "Messi", PlayerOvr = 95 });
            var player2Id = 102;
            db.PesPlayerTeams.Add(new PesPlayerTeam { IdPlayer = player2Id, PlayerName = "Ronaldo", PlayerOvr = 94 });

            // Seed ended auctions (now >= FinalEndTime)
            // Auction 1: User is highest bidder (Leading & Won)
            var auction1 = new AuctionBoard
            {
                AuctionId = 1,
                PlayerId = player1Id,
                HighestBidderId = userId,
                CurrentPrice = 96,
                NormalEndTime = DateTime.UtcNow.AddHours(-4),
                FinalEndTime = DateTime.UtcNow.AddHours(-2),
                DbStatus = "Active",
                RowVersion = new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }
            };
            db.AuctionBoards.Add(auction1);

            // Auction 2: Other user won with a higher final bid
            var auction2 = new AuctionBoard
            {
                AuctionId = 2,
                PlayerId = player2Id,
                HighestBidderId = 11, // Winner
                CurrentPrice = 110,
                NormalEndTime = DateTime.UtcNow.AddHours(-4),
                FinalEndTime = DateTime.UtcNow.AddHours(-2),
                DbStatus = "Active",
                RowVersion = new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }
            };
            db.AuctionBoards.Add(auction2);

            // Our user placed a bid in normal phase and a final bid of 100 (which lost to 110)
            db.AuctionBidLogs.Add(new AuctionBidLog
            {
                AuctionId = 2,
                UserId = userId,
                BidAmount = 90,
                Phase = "Normal",
                CreatedAt = DateTime.UtcNow.AddHours(-5)
            });
            db.AuctionBidLogs.Add(new AuctionBidLog
            {
                AuctionId = 2,
                UserId = userId,
                BidAmount = 100,
                Phase = "Final",
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            });

            // Winner user2 placed a normal bid and winning final bid of 110
            db.AuctionBidLogs.Add(new AuctionBidLog
            {
                AuctionId = 2,
                UserId = 11,
                BidAmount = 91,
                Phase = "Normal",
                CreatedAt = DateTime.UtcNow.AddHours(-5)
            });
            db.AuctionBidLogs.Add(new AuctionBidLog
            {
                AuctionId = 2,
                UserId = 11,
                BidAmount = 110,
                Phase = "Final",
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            });

            await db.SaveChangesAsync();

            var notificationMock = new Mock<INotificationService>();
            var aiMock = new Mock<IAiService>();
            var discordMock = new Mock<IDiscordService>();

            var service = new AuctionService(db, db, notificationMock.Object, aiMock.Object, discordMock.Object);

            // Act
            var summary = await service.GetUserSummaryAsync(userId);

            // Assert
            // Only Messi (which our user won) should be counted. Ronaldo (which other user won) should NOT be counted anymore
            // since the final bid round has already ended.
            Assert.NotNull(summary);
            Assert.Equal(1, summary.CurrentSquadCount);

            var sGradeQuota = summary.Quotas.FirstOrDefault(q => q.GradeName == "S");
            Assert.NotNull(sGradeQuota);
            Assert.Equal(1, sGradeQuota.CurrentCount); // Only Messi
        }
    }
}
