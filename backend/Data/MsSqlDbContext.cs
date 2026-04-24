using Microsoft.EntityFrameworkCore;
using eTPL.API.Models;
using eTPL.API.Models.Auction;

namespace eTPL.API.Data
{
    // DbContext สำหรับ MS SQL — เก็บ tbm_user และ business tables อื่นæ
    public class MsSqlDbContext : DbContext
    {
        public MsSqlDbContext(DbContextOptions<MsSqlDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Permission> Permissions { get; set; }

        public DbSet<PesPlayerTeam> PesPlayerTeams { get; set; }
        public DbSet<AuctionSetting> AuctionSettings { get; set; }
        public DbSet<AuctionGradeQuota> AuctionGradeQuotas { get; set; }
        public DbSet<AuctionUserWallet> AuctionUserWallets { get; set; }
        public DbSet<AuctionSquad> AuctionSquads { get; set; }
        public DbSet<AuctionBoard> AuctionBoards { get; set; }
        public DbSet<AuctionBidLog> AuctionBidLogs { get; set; }
        public DbSet<AuctionTransaction> AuctionTransactions { get; set; }
        public DbSet<TransferOffer> TransferOffers { get; set; }
        public DbSet<SpecialBonus> SpecialBonuses { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasDefaultSchema("dbo");

            modelBuilder.Entity<SpecialBonus>(entity =>
            {
                entity.ToTable("tbs_special_bonus", "dbo");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Pending");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .HasPrincipalKey(e => e.Id)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("tbm_user", "dbo", t => t.ExcludeFromMigrations());
                entity.HasKey(e => e.UserId); 
                entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
                entity.HasAlternateKey(e => e.Id);
                entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Password).HasColumnName("password").IsRequired();
                entity.Property(e => e.UserLevel).HasColumnName("user_level").HasMaxLength(20).HasDefaultValue("user");
                entity.Property(e => e.LineId).HasColumnName("line_id").HasMaxLength(100);
                entity.Property(e => e.LinePic).HasColumnName("line_pic").HasMaxLength(500);
                entity.Property(e => e.LineName).HasColumnName("line_name").HasMaxLength(200);
                entity.Property(e => e.CurrentTeam).HasColumnName("current_team").HasMaxLength(100);
            });

            modelBuilder.Entity<PesPlayerTeam>(entity =>
            {
                entity.ToTable("pes_player_team", "dbo", t => t.ExcludeFromMigrations());
                entity.HasKey(e => e.IdPlayer);
                entity.Property(e => e.IdPlayer).HasColumnName("id_player");
                entity.Property(e => e.PlayerName).HasColumnName("player_name");
                entity.Property(e => e.IdTeam).HasColumnName("id_team");
                entity.Property(e => e.TeamName).HasColumnName("team_name");
                entity.Property(e => e.PlayerOvr).HasColumnName("player_ovr");
                entity.Property(e => e.League).HasColumnName("league");
                entity.Property(e => e.Position).HasColumnName("position");
                entity.Property(e => e.PlayingStyle).HasColumnName("playing_style");
                entity.Property(e => e.Foot).HasColumnName("foot");
                entity.Property(e => e.Nationality).HasColumnName("nationality");
                entity.Property(e => e.Height).HasColumnName("height");
                entity.Property(e => e.Weight).HasColumnName("weight");
                entity.Property(e => e.Age).HasColumnName("age");
            });

            modelBuilder.Entity<AuctionSetting>(entity =>
            {
                entity.ToTable("tbs_auction_settings", "dbo");
                entity.HasKey(e => e.SettingId);
                entity.Property(e => e.SettingId).HasColumnName("setting_id");
                
                // Seed Date default range settings
                var defaultSetting = new AuctionSetting 
                { 
                    SettingId = 1,
                    StartingBudget = 2000,
                    MaxSquadSize = 23,
                    MinBidPrice = 60,
                    AuctionStartDate = null,
                    AuctionEndDate = null,
                    DailyBidStartTime = new TimeSpan(8, 0, 0),
                    DailyBidEndTime = new TimeSpan(23, 59, 59)
                };
                entity.HasData(defaultSetting);
            });

            modelBuilder.Entity<AuctionGradeQuota>(entity =>
            {
                entity.ToTable("tbs_auction_grade_quota", "dbo");
                entity.HasKey(e => e.GradeId);
                entity.Property(e => e.GradeId).HasColumnName("grade_id");
                
                entity.HasData(
                    new AuctionGradeQuota { GradeId = 1, GradeName = "S", MinOVR = 82, MaxOVR = 99, MaxAllowedPerUser = 1 },
                    new AuctionGradeQuota { GradeId = 2, GradeName = "A", MinOVR = 81, MaxOVR = 81, MaxAllowedPerUser = 1 },
                    new AuctionGradeQuota { GradeId = 3, GradeName = "B", MinOVR = 79, MaxOVR = 80, MaxAllowedPerUser = 4 },
                    new AuctionGradeQuota { GradeId = 4, GradeName = "C", MinOVR = 77, MaxOVR = 78, MaxAllowedPerUser = 8 },
                    new AuctionGradeQuota { GradeId = 5, GradeName = "D", MinOVR = 75, MaxOVR = 76, MaxAllowedPerUser = 8 },
                    new AuctionGradeQuota { GradeId = 6, GradeName = "E", MinOVR = 65, MaxOVR = 74, MaxAllowedPerUser = 99 }
                );
            });

            modelBuilder.Entity<AuctionUserWallet>(entity =>
            {
                entity.ToTable("tbs_auction_user_wallet", "dbo");
                entity.HasKey(e => e.WalletId);
                entity.Property(e => e.WalletId).HasColumnName("wallet_id");
                entity.HasIndex(e => e.UserId).IsUnique(); // 1:1 using Id
                
                entity.HasOne(e => e.User)
                      .WithOne()
                      .HasForeignKey<AuctionUserWallet>(e => e.UserId)
                      .HasPrincipalKey<User>(e => e.Id)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AuctionSquad>(entity =>
            {
                entity.ToTable("tbs_auction_squad", "dbo");
                entity.HasKey(e => e.SquadId);
                entity.Property(e => e.SquadId).HasColumnName("squad_id");
                entity.HasIndex(e => new { e.UserId, e.PlayerId }).IsUnique();

                entity.Property(e => e.PricePaid).HasDefaultValue(0);
                entity.Property(e => e.AcquiredAt).HasDefaultValueSql("GETUTCDATE()");
                entity.Property(e => e.IsLoan).HasDefaultValue(false);
                entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Active");

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .HasPrincipalKey(e => e.Id)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Player)
                      .WithMany()
                      .HasForeignKey(e => e.PlayerId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AuctionTransaction>(entity =>
            {
                entity.ToTable("tbs_auction_transactions", "dbo");
                entity.HasKey(e => e.TransactionId);
                entity.Property(e => e.TransactionId).HasColumnName("transaction_id");
                entity.Property(e => e.Direction).HasMaxLength(10).HasDefaultValue("DEBIT");
                entity.Property(e => e.Type).HasMaxLength(40);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .HasPrincipalKey(e => e.Id)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AuctionBoard>(entity =>
            {
                entity.ToTable("tbs_auction_board", "dbo");
                entity.HasKey(e => e.AuctionId);
                entity.Property(e => e.AuctionId).HasColumnName("auction_id");
                entity.Property(e => e.RowVersion).IsRowVersion();
                entity.Property(e => e.DbStatus).HasMaxLength(20);

                entity.HasOne(e => e.Player)
                      .WithMany()
                      .HasForeignKey(e => e.PlayerId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Initiator)
                      .WithMany()
                      .HasForeignKey(e => e.InitiatorUserId)
                      .HasPrincipalKey(e => e.Id)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.HighestBidder)
                      .WithMany()
                      .HasForeignKey(e => e.HighestBidderId)
                      .HasPrincipalKey(e => e.Id)
                      .IsRequired(false)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AuctionBidLog>(entity =>
            {
                entity.ToTable("tbs_auction_bid_log", "dbo");
                entity.HasKey(e => e.LogId);
                entity.Property(e => e.LogId).HasColumnName("log_id");
                entity.Property(e => e.Phase).HasMaxLength(20);

                entity.HasOne(e => e.Auction)
                      .WithMany()
                      .HasForeignKey(e => e.AuctionId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .HasPrincipalKey(e => e.Id)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<TransferOffer>(entity =>
            {
                entity.ToTable("tbs_transfer_offer", "dbo");
                entity.HasKey(e => e.OfferId);
                entity.Property(e => e.OfferId).HasColumnName("offer_id");
                entity.Property(e => e.OfferType).HasMaxLength(20).HasDefaultValue("Transfer");
                entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Pending");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(e => e.Squad)
                      .WithMany()
                      .HasForeignKey(e => e.SquadId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.FromUser)
                      .WithMany()
                      .HasForeignKey(e => e.FromUserId)
                      .HasPrincipalKey(e => e.Id)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.ToUser)
                      .WithMany()
                      .HasForeignKey(e => e.ToUserId)
                      .HasPrincipalKey(e => e.Id)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Notification>(entity =>
            {
                entity.ToTable("tbs_notifications", "dbo");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
                
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .HasPrincipalKey(e => e.Id)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Permission>(entity =>
            {
                entity.ToTable("tbm_permission", "dbo", t => t.ExcludeFromMigrations());
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
                entity.Property(e => e.MenuKey).HasColumnName("menu_key").HasMaxLength(50).IsRequired();
                entity.Property(e => e.MenuLabel).HasColumnName("menu_label").HasMaxLength(100).IsRequired();
                entity.Property(e => e.UserLevel).HasColumnName("user_level").HasMaxLength(20).IsRequired();
                entity.Property(e => e.CanAccess).HasColumnName("can_access").HasDefaultValue(false);
                entity.HasIndex(e => new { e.MenuKey, e.UserLevel }).IsUnique();
            });
        }
    }
}
