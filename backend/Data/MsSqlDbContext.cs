using Microsoft.EntityFrameworkCore;
using eTPL.API.Models;

namespace eTPL.API.Data
{
    // DbContext สำหรับ MS SQL — เก็บ tbm_user และ business tables อื่นæ
    public class MsSqlDbContext : DbContext
    {
        public MsSqlDbContext(DbContextOptions<MsSqlDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Permission> Permissions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("tbm_user");
                entity.HasKey(e => e.UserId);
                entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Password).HasColumnName("password").IsRequired();
                entity.Property(e => e.UserLevel).HasColumnName("user_level").HasMaxLength(20).HasDefaultValue("user");
                entity.Property(e => e.LineId).HasColumnName("line_id").HasMaxLength(100);
                entity.Property(e => e.LinePic).HasColumnName("line_pic").HasMaxLength(500);
                entity.Property(e => e.LineName).HasColumnName("line_name").HasMaxLength(200);
            });

            // TODO: กำหนด mapping สำหรับ business tables อื่นæ

            modelBuilder.Entity<Permission>(entity =>
            {
                entity.ToTable("tbm_permission");
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
