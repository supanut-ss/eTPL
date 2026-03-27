using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Models.Scaffolded;

namespace eTPL.API.Data.Scaffolded;

public partial class ScaffoldedDbContext : DbContext
{
    public ScaffoldedDbContext(DbContextOptions<ScaffoldedDbContext> options)
        : base(options)
    {
    }

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

    public virtual DbSet<TbmPermission> TbmPermissions { get; set; }

    public virtual DbSet<TbmTeam> TbmTeams { get; set; }

    public virtual DbSet<TbmUser> TbmUsers { get; set; }

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("thaipes_sa");

        modelBuilder.Entity<ApiVFixtureAll>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("api_v_fixture_all", "dbo");

            entity.Property(e => e.Active)
                .HasMaxLength(3)
                .HasColumnName("ACTIVE");
            entity.Property(e => e.Away)
                .HasMaxLength(50)
                .HasColumnName("AWAY");
            entity.Property(e => e.AwayImage)
                .HasMaxLength(4000)
                .HasColumnName("AWAY_IMAGE");
            entity.Property(e => e.AwayScore).HasColumnName("AWAY_SCORE");
            entity.Property(e => e.AwayTeamName)
                .HasMaxLength(50)
                .HasColumnName("AWAY_TEAM_NAME");
            entity.Property(e => e.AwayUserId).HasColumnName("AWAY_USER_ID");
            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.FixtureId)
                .HasMaxLength(50)
                .HasColumnName("fixture_id");
            entity.Property(e => e.Home)
                .HasMaxLength(50)
                .HasColumnName("HOME");
            entity.Property(e => e.HomeImage)
                .HasMaxLength(4000)
                .HasColumnName("HOME_IMAGE");
            entity.Property(e => e.HomeScore).HasColumnName("HOME_SCORE");
            entity.Property(e => e.HomeTeamName)
                .HasMaxLength(50)
                .HasColumnName("HOME_TEAM_NAME");
            entity.Property(e => e.HomeUserId).HasColumnName("HOME_USER_ID");
            entity.Property(e => e.IsPlayed)
                .HasMaxLength(3)
                .IsUnicode(false)
                .HasColumnName("IS_PLAYED");
            entity.Property(e => e.Leg).HasColumnName("LEG");
            entity.Property(e => e.Match).HasColumnName("MATCH");
            entity.Property(e => e.MatchDate)
                .HasColumnType("datetime")
                .HasColumnName("MATCH_DATE");
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Season).HasColumnName("SEASON");
        });

        modelBuilder.Entity<ApiVResultTable>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("api_v_result_table", "dbo");

            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.Ga).HasColumnName("GA");
            entity.Property(e => e.Gd).HasColumnName("GD");
            entity.Property(e => e.Gf).HasColumnName("GF");
            entity.Property(e => e.Image)
                .HasMaxLength(73)
                .HasColumnName("IMAGE");
            entity.Property(e => e.Last).HasMaxLength(50);
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Pos).HasColumnName("POS");
            entity.Property(e => e.Season).HasColumnName("SEASON");
            entity.Property(e => e.Team)
                .HasMaxLength(50)
                .HasColumnName("TEAM");
            entity.Property(e => e.TeamName)
                .HasMaxLength(50)
                .HasColumnName("TEAM_NAME");
            entity.Property(e => e.UserId).HasColumnName("USER_ID");
        });

        modelBuilder.Entity<BotMessage>(entity =>
        {
            entity.HasKey(e => e.MsgId);

            entity.ToTable("bot_message", "dbo");

            entity.Property(e => e.MsgId).HasColumnName("msg_id");
            entity.Property(e => e.InputMsg)
                .HasMaxLength(100)
                .HasColumnName("input_msg");
            entity.Property(e => e.ResponseMsg).HasColumnName("response_msg");
        });

        modelBuilder.Entity<InsertUser>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("insert_user", "dbo");

            entity.Property(e => e.Expr1).HasMaxLength(32);
            entity.Property(e => e.Expr2)
                .HasMaxLength(6)
                .IsUnicode(false);
            entity.Property(e => e.Expr3)
                .HasMaxLength(1)
                .IsUnicode(false);
            entity.Property(e => e.Player)
                .HasMaxLength(50)
                .HasColumnName("PLAYER");
            entity.Property(e => e.TeamId).HasColumnName("TEAM_ID");
        });

        modelBuilder.Entity<TblFixtureLog>(entity =>
        {
            entity.HasKey(e => e.FixtureId);

            entity.ToTable("tbl_fixture_log", "dbo");

            entity.Property(e => e.FixtureId)
                .HasMaxLength(50)
                .HasDefaultValueSql("(newid())", "DF_tbl_fixture_log_fixture_id")
                .HasColumnName("fixture_id");
            entity.Property(e => e.Active)
                .HasMaxLength(3)
                .HasColumnName("ACTIVE");
            entity.Property(e => e.Away)
                .HasMaxLength(50)
                .HasColumnName("AWAY");
            entity.Property(e => e.AwayScore).HasColumnName("AWAY_SCORE");
            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.Home)
                .HasMaxLength(50)
                .HasColumnName("HOME");
            entity.Property(e => e.HomeScore).HasColumnName("HOME_SCORE");
            entity.Property(e => e.Match).HasColumnName("MATCH");
            entity.Property(e => e.MatchDate)
                .HasColumnType("datetime")
                .HasColumnName("MATCH_DATE");
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Season).HasColumnName("SEASON");
        });

        modelBuilder.Entity<TblLeave>(entity =>
        {
            entity.HasKey(e => e.LeaveId);

            entity.ToTable("tbl_leave", "dbo");

            entity.Property(e => e.LeaveId)
                .HasDefaultValueSql("(newid())", "DF_tbl_leave_leave_id")
                .HasColumnName("leave_id");
            entity.Property(e => e.DateFrom)
                .HasMaxLength(10)
                .HasColumnName("DATE_FROM");
            entity.Property(e => e.DateTo)
                .HasMaxLength(10)
                .HasColumnName("DATE_TO");
            entity.Property(e => e.Platform)
                .HasMaxLength(2)
                .IsUnicode(false)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Reason).HasColumnName("REASON");
            entity.Property(e => e.UserId)
                .HasMaxLength(10)
                .IsFixedLength()
                .HasColumnName("USER_ID");
            entity.Property(e => e.UserName)
                .HasMaxLength(50)
                .HasColumnName("USER_NAME");
        });

        modelBuilder.Entity<TbmAnnouce>(entity =>
        {
            entity.ToTable("tbm_annouce", "dbo");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())", "DF_tbm_annouce_id")
                .HasColumnName("id");
            entity.Property(e => e.Announcement).HasColumnName("announcement");
            entity.Property(e => e.Announcer)
                .HasMaxLength(50)
                .HasColumnName("announcer");
            entity.Property(e => e.CreateDate)
                .HasDefaultValueSql("(getdate())", "DF_tbm_annouce_create_date")
                .HasColumnType("datetime")
                .HasColumnName("create_date");
            entity.Property(e => e.Platform)
                .HasMaxLength(4)
                .HasColumnName("platform");
        });

        modelBuilder.Entity<TbmCurrentSeason>(entity =>
        {
            entity.ToTable("tbm_current_season", "dbo");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())", "DF_tbm_current_season_id")
                .HasColumnName("id");
            entity.Property(e => e.Platform)
                .HasMaxLength(4)
                .HasColumnName("platform");
            entity.Property(e => e.Season).HasColumnName("season");
        });

        modelBuilder.Entity<TbmFinalResult>(entity =>
        {
            entity.ToTable("tbm_final_result", "dbo");

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .HasDefaultValueSql("(newid())", "DF_tbm_final_result_ID")
                .HasColumnName("ID");
            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.Ga).HasColumnName("GA");
            entity.Property(e => e.Gd).HasColumnName("GD");
            entity.Property(e => e.Gf).HasColumnName("GF");
            entity.Property(e => e.Image)
                .HasMaxLength(300)
                .HasColumnName("IMAGE");
            entity.Property(e => e.Platform)
                .HasMaxLength(50)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Position).HasColumnName("POSITION");
            entity.Property(e => e.Season).HasColumnName("SEASON");
            entity.Property(e => e.Team)
                .HasMaxLength(200)
                .HasColumnName("TEAM");
            entity.Property(e => e.TeamName)
                .HasMaxLength(50)
                .HasColumnName("TEAM_NAME");
        });

        modelBuilder.Entity<TbmFixtureAll>(entity =>
        {
            entity.HasKey(e => e.FixtureId).HasName("PK_tbm_Fixture_All");

            entity.ToTable("tbm_fixture_all", "dbo");

            entity.Property(e => e.FixtureId)
                .HasMaxLength(50)
                .HasDefaultValueSql("(newid())", "DF_tbm_Fixture_All_fixture_id")
                .HasColumnName("fixture_id");
            entity.Property(e => e.Active)
                .HasMaxLength(3)
                .HasColumnName("ACTIVE");
            entity.Property(e => e.Away)
                .HasMaxLength(50)
                .HasColumnName("AWAY");
            entity.Property(e => e.AwayScore).HasColumnName("AWAY_SCORE");
            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.Home)
                .HasMaxLength(50)
                .HasColumnName("HOME");
            entity.Property(e => e.HomeScore).HasColumnName("HOME_SCORE");
            entity.Property(e => e.Leg).HasColumnName("LEG");
            entity.Property(e => e.Match).HasColumnName("MATCH");
            entity.Property(e => e.MatchDate)
                .HasColumnType("datetime")
                .HasColumnName("MATCH_DATE");
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Season).HasColumnName("SEASON");
        });

        modelBuilder.Entity<TbmHof>(entity =>
        {
            entity.HasKey(e => e.HofId);

            entity.ToTable("tbm_hof", "dbo");

            entity.Property(e => e.HofId)
                .HasMaxLength(50)
                .HasDefaultValueSql("(newid())", "DF_tbm_hof_hof_id")
                .HasColumnName("hof_id");
            entity.Property(e => e.D1).HasMaxLength(255);
            entity.Property(e => e.D2).HasMaxLength(255);
            entity.Property(e => e.FaCup)
                .HasMaxLength(255)
                .HasColumnName("FA CUP");
            entity.Property(e => e.LeagueCup)
                .HasMaxLength(255)
                .HasColumnName("LEAGUE CUP");
            entity.Property(e => e.Platform)
                .HasMaxLength(255)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Season).HasColumnName("SEASON");
            entity.Property(e => e.ThaiClubCup)
                .HasMaxLength(255)
                .HasColumnName("THAI CLUB CUP");
        });

        modelBuilder.Entity<TbmNewMember>(entity =>
        {
            entity.ToTable("tbm_new_member", "dbo");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())", "DF_tbm_new_member_id")
                .HasColumnName("id");
            entity.Property(e => e.Facebook)
                .HasMaxLength(300)
                .HasColumnName("facebook");
            entity.Property(e => e.MemberId)
                .HasMaxLength(50)
                .HasColumnName("member_id");
            entity.Property(e => e.MemberImage).HasColumnName("member_image");
            entity.Property(e => e.MemberName)
                .HasMaxLength(100)
                .HasColumnName("member_name");
            entity.Property(e => e.Platform)
                .HasMaxLength(2)
                .HasColumnName("platform");
        });

        modelBuilder.Entity<TbmPermission>(entity =>
        {
            entity.ToTable("tbm_permission", "dbo");

            entity.HasIndex(e => new { e.MenuKey, e.UserLevel }, "UQ_tbm_permission_menu_level").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CanAccess).HasColumnName("can_access");
            entity.Property(e => e.MenuKey)
                .HasMaxLength(50)
                .HasColumnName("menu_key");
            entity.Property(e => e.MenuLabel)
                .HasMaxLength(100)
                .HasColumnName("menu_label");
            entity.Property(e => e.UserLevel)
                .HasMaxLength(20)
                .HasColumnName("user_level");
        });

        modelBuilder.Entity<TbmTeam>(entity =>
        {
            entity.ToTable("tbm_team", "dbo");

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .HasDefaultValueSql("(newid())", "DF_tbm_team_id")
                .HasColumnName("id");
            entity.Property(e => e.Division)
                .HasMaxLength(50)
                .HasColumnName("DIVISION");
            entity.Property(e => e.Image)
                .HasMaxLength(50)
                .HasColumnName("IMAGE");
            entity.Property(e => e.Md5TeamId)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("MD5_TEAM_ID");
            entity.Property(e => e.Overall).HasColumnName("OVERALL");
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Player)
                .HasMaxLength(50)
                .HasColumnName("PLAYER");
            entity.Property(e => e.Season).HasColumnName("SEASON");
            entity.Property(e => e.TeamId).HasColumnName("TEAM_ID");
            entity.Property(e => e.TeamName)
                .HasMaxLength(50)
                .HasColumnName("TEAM_NAME");
            entity.Property(e => e.UserId).HasColumnName("USER_ID");
        });

        modelBuilder.Entity<TbmUser>(entity =>
        {
            entity.HasKey(e => e.UserId);

            entity.ToTable("tbm_user", "dbo");

            entity.Property(e => e.UserId)
                .HasMaxLength(100)
                .HasColumnName("user_id");
            entity.Property(e => e.LineId)
                .HasMaxLength(100)
                .HasColumnName("line_id");
            entity.Property(e => e.LineName)
                .HasMaxLength(200)
                .HasColumnName("line_name");
            entity.Property(e => e.LinePic)
                .HasMaxLength(500)
                .HasColumnName("line_pic");
            entity.Property(e => e.Password).HasColumnName("password");
            entity.Property(e => e.UserLevel)
                .HasMaxLength(20)
                .HasDefaultValue("user")
                .HasColumnName("user_level");
        });

        modelBuilder.Entity<TbtResult>(entity =>
        {
            entity.ToTable("tbt_result", "dbo");

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .HasDefaultValueSql("(newid())", "DF_tbt_result_id")
                .HasColumnName("id");
            entity.Property(e => e.CreateDate)
                .HasDefaultValueSql("(getdate())", "DF_tbt_result_create_date")
                .HasColumnType("datetime")
                .HasColumnName("create_date");
            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.FixtureId)
                .HasMaxLength(50)
                .HasColumnName("fixture_id");
            entity.Property(e => e.Ga).HasColumnName("GA");
            entity.Property(e => e.Gd).HasColumnName("GD");
            entity.Property(e => e.Gf).HasColumnName("GF");
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Season).HasColumnName("SEASON");
            entity.Property(e => e.Team)
                .HasMaxLength(50)
                .HasColumnName("TEAM");
        });

        modelBuilder.Entity<VCurrentTeam>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("v_current_team", "dbo");

            entity.Property(e => e.Division)
                .HasMaxLength(50)
                .HasColumnName("DIVISION");
            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .HasColumnName("id");
            entity.Property(e => e.Image)
                .HasMaxLength(50)
                .HasColumnName("IMAGE");
            entity.Property(e => e.Md5TeamId)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("MD5_TEAM_ID");
            entity.Property(e => e.Overall).HasColumnName("OVERALL");
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Player)
                .HasMaxLength(50)
                .HasColumnName("PLAYER");
            entity.Property(e => e.Season).HasColumnName("SEASON");
            entity.Property(e => e.TeamId).HasColumnName("TEAM_ID");
            entity.Property(e => e.TeamName)
                .HasMaxLength(50)
                .HasColumnName("TEAM_NAME");
            entity.Property(e => e.UserId).HasColumnName("USER_ID");
        });

        modelBuilder.Entity<VFixture>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("v_fixture", "dbo");

            entity.Property(e => e.AImage)
                .HasMaxLength(50)
                .HasColumnName("A_IMAGE");
            entity.Property(e => e.AName)
                .HasMaxLength(50)
                .HasColumnName("A_NAME");
            entity.Property(e => e.Active)
                .HasMaxLength(3)
                .HasColumnName("ACTIVE");
            entity.Property(e => e.Away)
                .HasMaxLength(50)
                .HasColumnName("AWAY");
            entity.Property(e => e.AwayScore).HasColumnName("AWAY_SCORE");
            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.FixtureId)
                .HasMaxLength(50)
                .HasColumnName("fixture_id");
            entity.Property(e => e.HImage)
                .HasMaxLength(50)
                .HasColumnName("H_IMAGE");
            entity.Property(e => e.Hname)
                .HasMaxLength(50)
                .HasColumnName("HNAME");
            entity.Property(e => e.Home)
                .HasMaxLength(50)
                .HasColumnName("HOME");
            entity.Property(e => e.HomeScore).HasColumnName("HOME_SCORE");
            entity.Property(e => e.Match).HasColumnName("MATCH");
            entity.Property(e => e.Season).HasColumnName("SEASON");
        });

        modelBuilder.Entity<VFixtureAll>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("v_fixture_all", "dbo");

            entity.Property(e => e.Active)
                .HasMaxLength(3)
                .HasColumnName("ACTIVE");
            entity.Property(e => e.Away)
                .HasMaxLength(50)
                .HasColumnName("AWAY");
            entity.Property(e => e.AwayImage)
                .HasMaxLength(73)
                .HasColumnName("AWAY_IMAGE");
            entity.Property(e => e.AwayScore).HasColumnName("AWAY_SCORE");
            entity.Property(e => e.AwayTeamName)
                .HasMaxLength(50)
                .HasColumnName("AWAY_TEAM_NAME");
            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.FixtureId)
                .HasMaxLength(50)
                .HasColumnName("fixture_id");
            entity.Property(e => e.Home)
                .HasMaxLength(50)
                .HasColumnName("HOME");
            entity.Property(e => e.HomeImage)
                .HasMaxLength(73)
                .HasColumnName("HOME_IMAGE");
            entity.Property(e => e.HomeScore).HasColumnName("HOME_SCORE");
            entity.Property(e => e.HomeTeamName)
                .HasMaxLength(50)
                .HasColumnName("HOME_TEAM_NAME");
            entity.Property(e => e.Match).HasColumnName("MATCH");
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Season).HasColumnName("SEASON");
        });

        modelBuilder.Entity<VFixtureAllLog>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("v_fixture_all_log", "dbo");

            entity.Property(e => e.Active)
                .HasMaxLength(3)
                .HasColumnName("ACTIVE");
            entity.Property(e => e.Away)
                .HasMaxLength(50)
                .HasColumnName("AWAY");
            entity.Property(e => e.AwayImage)
                .HasMaxLength(73)
                .HasColumnName("AWAY_IMAGE");
            entity.Property(e => e.AwayScore).HasColumnName("AWAY_SCORE");
            entity.Property(e => e.AwayTeamName)
                .HasMaxLength(50)
                .HasColumnName("AWAY_TEAM_NAME");
            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.FixtureId)
                .HasMaxLength(50)
                .HasColumnName("fixture_id");
            entity.Property(e => e.Home)
                .HasMaxLength(50)
                .HasColumnName("HOME");
            entity.Property(e => e.HomeImage)
                .HasMaxLength(73)
                .HasColumnName("HOME_IMAGE");
            entity.Property(e => e.HomeScore).HasColumnName("HOME_SCORE");
            entity.Property(e => e.HomeTeamName)
                .HasMaxLength(50)
                .HasColumnName("HOME_TEAM_NAME");
            entity.Property(e => e.Match).HasColumnName("MATCH");
            entity.Property(e => e.MatchDate)
                .HasColumnType("datetime")
                .HasColumnName("MATCH_DATE");
            entity.Property(e => e.MatchDateDisplay)
                .HasMaxLength(10)
                .HasColumnName("MATCH_DATE_DISPLAY");
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.ResultImage)
                .HasMaxLength(14)
                .IsUnicode(false)
                .HasColumnName("RESULT_IMAGE");
            entity.Property(e => e.Season).HasColumnName("SEASON");
        });

        modelBuilder.Entity<VHof>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("v_hof", "dbo");

            entity.Property(e => e.D1).HasMaxLength(255);
            entity.Property(e => e.D1Image)
                .HasMaxLength(272)
                .HasColumnName("D1_IMAGE");
            entity.Property(e => e.D2).HasMaxLength(255);
            entity.Property(e => e.D2Image)
                .HasMaxLength(272)
                .HasColumnName("D2_IMAGE");
            entity.Property(e => e.FaCup)
                .HasMaxLength(255)
                .HasColumnName("FA CUP");
            entity.Property(e => e.FaImage)
                .HasMaxLength(272)
                .HasColumnName("FA_IMAGE");
            entity.Property(e => e.HofId)
                .HasMaxLength(50)
                .HasColumnName("hof_id");
            entity.Property(e => e.LcImage)
                .HasMaxLength(272)
                .HasColumnName("LC_IMAGE");
            entity.Property(e => e.LeagueCup)
                .HasMaxLength(255)
                .HasColumnName("LEAGUE CUP");
            entity.Property(e => e.Platform)
                .HasMaxLength(255)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Season).HasColumnName("SEASON");
            entity.Property(e => e.SeasonImage)
                .HasMaxLength(19)
                .IsUnicode(false)
                .HasColumnName("SEASON_IMAGE");
            entity.Property(e => e.ThImage)
                .HasMaxLength(272)
                .HasColumnName("TH_IMAGE");
            entity.Property(e => e.ThaiClubCup)
                .HasMaxLength(255)
                .HasColumnName("THAI CLUB CUP");
        });

        modelBuilder.Entity<VLastFixture>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("v_last_fixture", "dbo");

            entity.Property(e => e.AUserId).HasColumnName("A_USER_ID");
            entity.Property(e => e.Away)
                .HasMaxLength(50)
                .HasColumnName("AWAY");
            entity.Property(e => e.AwayScore).HasColumnName("AWAY_SCORE");
            entity.Property(e => e.HUserId).HasColumnName("H_USER_ID");
            entity.Property(e => e.Home)
                .HasMaxLength(50)
                .HasColumnName("HOME");
            entity.Property(e => e.HomeScore).HasColumnName("HOME_SCORE");
            entity.Property(e => e.MatchDate)
                .HasColumnType("datetime")
                .HasColumnName("MATCH_DATE");
        });

        modelBuilder.Entity<VPlayerDraw>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("v_player_draw", "dbo");

            entity.Property(e => e.Division)
                .HasMaxLength(50)
                .HasColumnName("DIVISION");
            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.Player)
                .HasMaxLength(50)
                .HasColumnName("PLAYER");
        });

        modelBuilder.Entity<VResultTable>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("v_result_table", "dbo");

            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.Ga).HasColumnName("GA");
            entity.Property(e => e.Gd).HasColumnName("GD");
            entity.Property(e => e.Gf).HasColumnName("GF");
            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.Image)
                .HasMaxLength(71)
                .HasColumnName("IMAGE");
            entity.Property(e => e.Season).HasColumnName("SEASON");
            entity.Property(e => e.Team)
                .HasMaxLength(103)
                .HasColumnName("TEAM");
            entity.Property(e => e.TeamName)
                .HasMaxLength(50)
                .HasColumnName("TEAM_NAME");
        });

        modelBuilder.Entity<VResultTableCalculate>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("v_result_table_calculate", "dbo");

            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.Ga).HasColumnName("GA");
            entity.Property(e => e.Gd).HasColumnName("GD");
            entity.Property(e => e.Gf).HasColumnName("GF");
            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.Image)
                .HasMaxLength(73)
                .HasColumnName("IMAGE");
            entity.Property(e => e.Last).HasMaxLength(50);
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Season).HasColumnName("SEASON");
            entity.Property(e => e.Team)
                .HasMaxLength(50)
                .HasColumnName("TEAM");
            entity.Property(e => e.TeamName)
                .HasMaxLength(50)
                .HasColumnName("TEAM_NAME");
            entity.Property(e => e.UserId).HasColumnName("USER_ID");
        });

        modelBuilder.Entity<VResultTableNew>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("v_result_table_new", "dbo");

            entity.Property(e => e.Division)
                .HasMaxLength(2)
                .HasColumnName("DIVISION");
            entity.Property(e => e.Ga).HasColumnName("GA");
            entity.Property(e => e.Gd).HasColumnName("GD");
            entity.Property(e => e.Gf).HasColumnName("GF");
            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.Image)
                .HasMaxLength(73)
                .HasColumnName("IMAGE");
            entity.Property(e => e.Last).HasMaxLength(50);
            entity.Property(e => e.Platform)
                .HasMaxLength(10)
                .HasColumnName("PLATFORM");
            entity.Property(e => e.Season).HasColumnName("SEASON");
            entity.Property(e => e.Team)
                .HasMaxLength(50)
                .HasColumnName("TEAM");
            entity.Property(e => e.TeamName)
                .HasMaxLength(50)
                .HasColumnName("TEAM_NAME");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
