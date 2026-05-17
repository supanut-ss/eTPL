using Microsoft.EntityFrameworkCore;
using eTPL.API.Models;
using eTPL.API.Models.Auction;
using eTPL.API.Models.LeagueOps;
using eTPL.API.Models.Scaffolded;

namespace eTPL.API.Data
{
    public partial class MsSqlDbContext : DbContext
    {
        public MsSqlDbContext(DbContextOptions<MsSqlDbContext> options) : base(options) { }

        // --- Core Business Models ---
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
        public DbSet<CupFixture> CupFixtures { get; set; }
        public DbSet<LeagueCycle> LeagueCycles { get; set; }
        public DbSet<DailyCheckin> DailyCheckins { get; set; }
        public DbSet<LeagueOpsStatResult> LeagueOpsStatResults { get; set; }
        public DbSet<JudgeHistory> JudgeHistories { get; set; }
        public DbSet<QaInformation> QaInformation { get; set; }
        public DbSet<NotificationTemplate> NotificationTemplates { get; set; }
        public DbSet<ClubLogo> ClubLogos { get; set; }

        // --- Legacy / Scaffolded Models ---
        public virtual DbSet<ApiVFixtureAll> ApiVFixtureAlls { get; set; }
        public virtual DbSet<ApiVResultTable> ApiVResultTables { get; set; }
        public virtual DbSet<BotMessage> BotMessages { get; set; }
        public virtual DbSet<InsertUser> InsertUsers { get; set; }
        public virtual DbSet<TblFixtureLog> TblFixtureLogs { get; set; }
        public virtual DbSet<TblLeave> TblLeaves { get; set; }
        public virtual DbSet<TbmAnnouce> TbmAnnouces { get; set; }
        public virtual DbSet<TbmCurrentSeason> TbmCurrentSeasons { get; set; }
        public virtual DbSet<TbmFinalResult> TbmFinalResults { get; set; }
        public virtual DbSet<TbmFixtureAll> TbmFixtureAlls { get; set; }
        public virtual DbSet<TbmHof> TbmHofs { get; set; }
        public virtual DbSet<TbmNewMember> TbmNewMembers { get; set; }
        public virtual DbSet<TbmTeam> TbmTeams { get; set; }
        public virtual DbSet<TbtResult> TbtResults { get; set; }
        public virtual DbSet<VCurrentTeam> VCurrentTeams { get; set; }
        public virtual DbSet<VFixture> VFixtures { get; set; }
        public virtual DbSet<VFixtureAll> VFixtureAlls { get; set; }
        public virtual DbSet<VFixtureAllLog> VFixtureAllLogs { get; set; }
        public virtual DbSet<VHof> VHofs { get; set; }
        public virtual DbSet<VLastFixture> VLastFixtures { get; set; }
        public virtual DbSet<VPlayerDraw> VPlayerDraws { get; set; }
        public virtual DbSet<VResultTable> VResultTables { get; set; }
        public virtual DbSet<VResultTableCalculate> VResultTableCalculates { get; set; }
        public virtual DbSet<VResultTableNew> VResultTableNews { get; set; }
        public virtual DbSet<TbmSystemSetting> TbmSystemSettings { get; set; }
        public virtual DbSet<TbsPrizeSetting> TbsPrizeSettings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasDefaultSchema("dbo");

            // ─── User & Permission ────────────────────────────────────────────────

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("tbm_user", "dbo", t => t.ExcludeFromMigrations());
                entity.HasKey(e => e.Id); // Verified: 'id' (INT) is the Primary Key in DB
                entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
                entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Password).HasColumnName("password").IsRequired();
                entity.Property(e => e.UserLevel).HasColumnName("user_level").HasMaxLength(20).HasDefaultValue("user");
                entity.Property(e => e.LineId).HasColumnName("line_id").HasMaxLength(100);
                entity.Property(e => e.LinePic).HasColumnName("line_pic").HasMaxLength(500);
                entity.Property(e => e.LineName).HasColumnName("line_name").HasMaxLength(200);
                entity.Property(e => e.CurrentTeam).HasColumnName("current_team").HasMaxLength(100);
                entity.Property(e => e.TeamNickname).HasColumnName("team_nickname").HasMaxLength(100);
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

            // ─── Auction System ────────────────────────────────────────────────────

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

            // AuctionSetting — properties already camelCase-friendly, just configure table/key
            modelBuilder.Entity<AuctionSetting>(entity =>
            {
                entity.ToTable("tbs_auction_settings", "dbo");
                entity.HasKey(e => e.SettingId);
                entity.Property(e => e.SettingId).HasColumnName("setting_id");
                entity.Property(e => e.StartingBudget).HasColumnName("StartingBudget");
                entity.Property(e => e.MaxSquadSize).HasColumnName("MaxSquadSize");
                entity.Property(e => e.MinBidPrice).HasColumnName("MinBidPrice");
                entity.Property(e => e.AuctionStartDate).HasColumnName("AuctionStartDate");
                entity.Property(e => e.AuctionEndDate).HasColumnName("AuctionEndDate");
                entity.Property(e => e.DailyBidStartTime).HasColumnName("DailyBidStartTime");
                entity.Property(e => e.DailyBidEndTime).HasColumnName("DailyBidEndTime");
                entity.Property(e => e.NormalBidDurationMinutes).HasColumnName("NormalBidDurationMinutes");
                entity.Property(e => e.FinalBidDurationMinutes).HasColumnName("FinalBidDurationMinutes");
                entity.Property(e => e.CurrentSeason).HasColumnName("CurrentSeason");
            });

            // AuctionGradeQuota — uses [Column] annotations in model
            modelBuilder.Entity<AuctionGradeQuota>(entity =>
            {
                entity.ToTable("tbs_auction_grade_quota", "dbo");
                entity.HasKey(e => e.GradeId);
                entity.Property(e => e.GradeId).HasColumnName("grade_id");
                entity.Property(e => e.GradeName).HasColumnName("GradeName");
                entity.Property(e => e.MinOVR).HasColumnName("MinOVR");
                entity.Property(e => e.MaxOVR).HasColumnName("MaxOVR");
                entity.Property(e => e.MaxAllowedPerUser).HasColumnName("MaxAllowedPerUser");
                entity.Property(e => e.RenewalPercent).HasColumnName("RenewalPercent");
                entity.Property(e => e.ReleasePercent).HasColumnName("ReleasePercent");
                entity.Property(e => e.MaxSeasonsPerTeam).HasColumnName("MaxSeasonsPerTeam");
            });

            modelBuilder.Entity<AuctionUserWallet>(entity =>
            {
                entity.ToTable("tbs_auction_user_wallet", "dbo");
                entity.HasKey(e => e.WalletId);
                entity.Property(e => e.WalletId).HasColumnName("wallet_id"); // Verified: snake_case PK
                // NOTE: The following columns are PascalCase in the database. DO NOT change to snake_case.
                entity.Property(e => e.UserId).HasColumnName("UserId");
                entity.Property(e => e.AvailableBalance).HasColumnName("AvailableBalance");
                entity.Property(e => e.ReservedBalance).HasColumnName("ReservedBalance");
                entity.HasIndex(e => e.UserId).IsUnique();
                entity.HasOne(e => e.User).WithOne()
                    .HasForeignKey<AuctionUserWallet>(e => e.UserId)
                    .HasPrincipalKey<User>(e => e.Id)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AuctionSquad>(entity =>
            {
                entity.ToTable("tbs_auction_squad", "dbo");
                entity.HasKey(e => e.SquadId);
                entity.Property(e => e.SquadId).HasColumnName("squad_id"); // Verified: snake_case PK
                // NOTE: The following columns are PascalCase in the database. DO NOT change to snake_case.
                entity.Property(e => e.UserId).HasColumnName("UserId");
                entity.Property(e => e.PlayerId).HasColumnName("PlayerId");
                entity.Property(e => e.PricePaid).HasColumnName("PricePaid");
                entity.Property(e => e.AcquiredAt).HasColumnName("AcquiredAt");
                entity.Property(e => e.SeasonsWithTeam).HasColumnName("SeasonsWithTeam");
                entity.Property(e => e.IsLoan).HasColumnName("IsLoan");
                entity.Property(e => e.LoanedFromUserId).HasColumnName("LoanedFromUserId");
                entity.Property(e => e.LoanExpiry).HasColumnName("LoanExpiry");
                entity.Property(e => e.Status).HasColumnName("Status");
                entity.Property(e => e.ListingPrice).HasColumnName("ListingPrice");
                entity.HasOne(e => e.User).WithMany()
                    .HasForeignKey(e => e.UserId)
                    .HasPrincipalKey(e => e.Id)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Player).WithMany()
                    .HasForeignKey(e => e.PlayerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AuctionTransaction>(entity =>
            {
                entity.ToTable("tbs_auction_transactions", "dbo");
                entity.HasKey(e => e.TransactionId);
                entity.Property(e => e.TransactionId).HasColumnName("transaction_id"); // Verified: snake_case PK
                // NOTE: The following columns are PascalCase in the database. DO NOT change to snake_case.
                entity.Property(e => e.UserId).HasColumnName("UserId");
                entity.Property(e => e.Amount).HasColumnName("Amount");
                entity.Property(e => e.Direction).HasColumnName("Direction");
                entity.Property(e => e.Type).HasColumnName("Type");
                entity.Property(e => e.Description).HasColumnName("Description");
                entity.Property(e => e.BalanceAfter).HasColumnName("BalanceAfter");
                entity.Property(e => e.RelatedAuctionId).HasColumnName("RelatedAuctionId");
                entity.Property(e => e.RelatedPlayerId).HasColumnName("RelatedPlayerId");
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
                entity.HasOne(e => e.User).WithMany()
                    .HasForeignKey(e => e.UserId)
                    .HasPrincipalKey(e => e.Id)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AuctionBoard>(entity =>
            {
                entity.ToTable("tbs_auction_board", "dbo");
                entity.HasKey(e => e.AuctionId);
                entity.Property(e => e.AuctionId).HasColumnName("auction_id"); // Verified: snake_case PK
                // NOTE: The following columns are PascalCase in the database. DO NOT change to snake_case.
                entity.Property(e => e.PlayerId).HasColumnName("PlayerId");
                entity.Property(e => e.InitiatorUserId).HasColumnName("InitiatorUserId");
                entity.Property(e => e.HighestBidderId).HasColumnName("HighestBidderId");
                entity.Property(e => e.CurrentPrice).HasColumnName("CurrentPrice");
                entity.Property(e => e.NormalEndTime).HasColumnName("NormalEndTime");
                entity.Property(e => e.FinalEndTime).HasColumnName("FinalEndTime");
                entity.Property(e => e.DbStatus).HasColumnName("DbStatus");
                entity.Property(e => e.RowVersion).HasColumnName("RowVersion").IsRowVersion();
                entity.HasOne(e => e.Player).WithMany()
                    .HasForeignKey(e => e.PlayerId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Initiator).WithMany()
                    .HasForeignKey(e => e.InitiatorUserId)
                    .HasPrincipalKey(e => e.Id)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.HighestBidder).WithMany()
                    .HasForeignKey(e => e.HighestBidderId)
                    .HasPrincipalKey(e => e.Id)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AuctionBidLog>(entity =>
            {
                entity.ToTable("tbs_auction_bid_log", "dbo");
                entity.HasKey(e => e.LogId);
                entity.Property(e => e.LogId).HasColumnName("log_id"); // Verified: snake_case PK
                // NOTE: The following columns are PascalCase in the database. DO NOT change to snake_case.
                entity.Property(e => e.AuctionId).HasColumnName("AuctionId");
                entity.Property(e => e.UserId).HasColumnName("UserId");
                entity.Property(e => e.BidAmount).HasColumnName("BidAmount");
                entity.Property(e => e.Phase).HasColumnName("Phase");
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
                entity.HasOne(e => e.Auction).WithMany()
                    .HasForeignKey(e => e.AuctionId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.User).WithMany()
                    .HasForeignKey(e => e.UserId)
                    .HasPrincipalKey(e => e.Id)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<TransferOffer>(entity =>
            {
                entity.ToTable("tbs_transfer_offer", "dbo");
                entity.HasKey(e => e.OfferId);
                entity.Property(e => e.OfferId).HasColumnName("offer_id"); // Verified: snake_case PK
                // NOTE: The following columns are PascalCase in the database. DO NOT change to snake_case.
                entity.Property(e => e.SquadId).HasColumnName("SquadId");
                entity.Property(e => e.FromUserId).HasColumnName("FromUserId");
                entity.Property(e => e.ToUserId).HasColumnName("ToUserId");
                entity.Property(e => e.OfferType).HasColumnName("OfferType");
                entity.Property(e => e.Amount).HasColumnName("Amount");
                entity.Property(e => e.Status).HasColumnName("Status");
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("UpdatedAt");
                entity.HasOne(e => e.Squad).WithMany()
                    .HasForeignKey(e => e.SquadId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.FromUser).WithMany()
                    .HasForeignKey(e => e.FromUserId)
                    .HasPrincipalKey(e => e.Id)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ToUser).WithMany()
                    .HasForeignKey(e => e.ToUserId)
                    .HasPrincipalKey(e => e.Id)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<SpecialBonus>(entity =>
            {
                entity.ToTable("tbs_special_bonus", "dbo");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("UserId");
                entity.Property(e => e.Amount).HasColumnName("Amount");
                entity.Property(e => e.Reason).HasColumnName("Reason");
                entity.Property(e => e.Status).HasColumnName("Status").HasDefaultValue("Pending");
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("GETDATE()");
                entity.Property(e => e.ApprovedAt).HasColumnName("ApprovedAt");
                entity.Property(e => e.ApprovedBy).HasColumnName("ApprovedBy");
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .HasPrincipalKey(e => e.Id)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ─── Notification ─────────────────────────────────────────────────────

            modelBuilder.Entity<Notification>(entity =>
            {
                entity.ToTable("tbs_notifications", "dbo");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("UserId");
                entity.Property(e => e.Title).HasColumnName("Title");
                entity.Property(e => e.Message).HasColumnName("Message");
                entity.Property(e => e.TargetUrl).HasColumnName("TargetUrl");
                entity.Property(e => e.IsRead).HasColumnName("IsRead");
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
                entity.HasOne(e => e.User).WithMany()
                    .HasForeignKey(e => e.UserId)
                    .HasPrincipalKey(e => e.Id)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ─── League Ops — uses [Column] data annotations, only set relationships ──

            modelBuilder.Entity<LeagueCycle>().ToTable("tbs_league_cycles", "dbo");
            modelBuilder.Entity<DailyCheckin>().ToTable("tbs_daily_checkins", "dbo");
            modelBuilder.Entity<JudgeHistory>().ToTable("tbs_judge_history", "dbo");
            modelBuilder.Entity<LeagueOpsStatResult>().HasNoKey();

            // ─── Cup & QA — uses [Table]/[Column] annotations ─────────────────────

            // CupFixture, QaInformation: table/column already in data annotations
            // Only set schema explicitly
            modelBuilder.Entity<CupFixture>().ToTable("tbs_cup_fixture", "dbo");
            modelBuilder.Entity<QaInformation>().ToTable("tbm_qa_information", "dbo");

            // ─── Prize Setting ────────────────────────────────────────────────────

            modelBuilder.Entity<TbsPrizeSetting>(entity =>
            {
                entity.ToTable("tbs_prize_setting", "dbo");
                entity.HasKey(e => e.Id);
            });

            modelBuilder.Entity<NotificationTemplate>(entity =>
            {
                entity.ToTable("tbs_notification_template", "dbo");
                entity.HasKey(e => e.Id);
            });

            // ─── Legacy / Scaffolded Mappings (full column mapping in partial class) ─
            ConfigureLegacyMappings(modelBuilder);
        }
    }
}
