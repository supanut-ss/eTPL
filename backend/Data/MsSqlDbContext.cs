using Microsoft.EntityFrameworkCore;
using eTPL.API.Models;

namespace eTPL.API.Data
{
    // DbContext สำหรับ MS SQL — เก็บ tbm_user และ business tables อื่นๆ
    public class MsSqlDbContext : DbContext
    {
        public MsSqlDbContext(DbContextOptions<MsSqlDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }

        // TODO: เพิ่ม DbSet สำหรับ business tables อื่นๆ ที่นี่

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

            // TODO: กำหนด mapping สำหรับ business tables อื่นๆ
        }
    }
}
