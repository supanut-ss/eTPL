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
            });

            // AuctionSetting — properties already camelCase-friendly, just configure table/key
            modelBuilder.Entity<AuctionSetting>(entity =>
            {
                entity.ToTable("tbs_auction_settings", "dbo");
                entity.HasKey(e => e.SettingId);
            });

            // AuctionGradeQuota — uses [Column] annotations in model
            modelBuilder.Entity<AuctionGradeQuota>(entity =>
            {
                entity.ToTable("tbs_auction_grade_quota", "dbo");
                entity.HasKey(e => e.GradeId);
            });

            modelBuilder.Entity<AuctionUserWallet>(entity =>
            {
                entity.ToTable("tbs_auction_user_wallet", "dbo");
                entity.HasKey(e => e.WalletId);
                entity.Property(e => e.WalletId).HasColumnName("wallet_id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.AvailableBalance).HasColumnName("available_balance");
                entity.Property(e => e.ReservedBalance).HasColumnName("reserved_balance");
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
                entity.Property(e => e.SquadId).HasColumnName("squad_id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.PlayerId).HasColumnName("play_id");
                entity.Property(e => e.PricePaid).HasColumnName("price_paid");
                entity.Property(e => e.AcquiredAt).HasColumnName("acquired_at");
                entity.Property(e => e.SeasonsWithTeam).HasColumnName("seasons_with_team");
                entity.Property(e => e.IsLoan).HasColumnName("is_loan");
                entity.Property(e => e.LoanedFromUserId).HasColumnName("loaned_from_user_id");
                entity.Property(e => e.LoanExpiry).HasColumnName("loan_expiry");
                entity.Property(e => e.Status).HasColumnName("status");
                entity.Property(e => e.ListingPrice).HasColumnName("listing_price");
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
                entity.Property(e => e.TransactionId).HasColumnName("transaction_id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.Amount).HasColumnName("amount");
                entity.Property(e => e.Direction).HasColumnName("direction");
                entity.Property(e => e.Type).HasColumnName("type");
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.BalanceAfter).HasColumnName("balance_after");
                entity.Property(e => e.RelatedAuctionId).HasColumnName("related_auction_id");
                entity.Property(e => e.RelatedPlayerId).HasColumnName("related_player_id");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.HasOne(e => e.User).WithMany()
                    .HasForeignKey(e => e.UserId)
                    .HasPrincipalKey(e => e.Id)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AuctionBoard>(entity =>
            {
                entity.ToTable("tbs_auction_board", "dbo");
                entity.HasKey(e => e.AuctionId);
                entity.Property(e => e.AuctionId).HasColumnName("auction_id");
                entity.Property(e => e.PlayerId).HasColumnName("play_id");
                entity.Property(e => e.InitiatorUserId).HasColumnName("initiator_user_id");
                entity.Property(e => e.HighestBidderId).HasColumnName("highest_bidder_id");
                entity.Property(e => e.CurrentPrice).HasColumnName("current_price");
                entity.Property(e => e.NormalEndTime).HasColumnName("normal_end_time");
                entity.Property(e => e.FinalEndTime).HasColumnName("final_end_time");
                entity.Property(e => e.DbStatus).HasColumnName("status");
                entity.Property(e => e.RowVersion).HasColumnName("row_version").IsRowVersion();
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
                entity.Property(e => e.LogId).HasColumnName("log_id");
                entity.Property(e => e.AuctionId).HasColumnName("auction_id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.BidAmount).HasColumnName("bid_amount");
                entity.Property(e => e.Phase).HasColumnName("phase");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
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
                entity.Property(e => e.OfferId).HasColumnName("offer_id");
                entity.Property(e => e.SquadId).HasColumnName("squad_id");
                entity.Property(e => e.FromUserId).HasColumnName("from_user_id");
                entity.Property(e => e.ToUserId).HasColumnName("to_user_id");
                entity.Property(e => e.OfferType).HasColumnName("offer_type");
                entity.Property(e => e.Amount).HasColumnName("amount");
                entity.Property(e => e.Status).HasColumnName("status");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
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
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.Amount).HasColumnName("amount");
                entity.Property(e => e.Reason).HasColumnName("reason");
                entity.Property(e => e.Status).HasColumnName("status").HasDefaultValue("Pending");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");
                entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
                entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
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
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.Title).HasColumnName("title");
                entity.Property(e => e.Message).HasColumnName("message");
                entity.Property(e => e.TargetUrl).HasColumnName("target_url");
                entity.Property(e => e.IsRead).HasColumnName("is_read");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
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

            // ─── Legacy / Scaffolded Mappings (full column mapping in partial class) ─
            ConfigureLegacyMappings(modelBuilder);
        }
    }
}
