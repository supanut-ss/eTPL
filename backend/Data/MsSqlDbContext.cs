using Microsoft.EntityFrameworkCore;

namespace eTPL.API.Data
{
    // DbContext สำหรับ MS SQL — เก็บข้อมูล business (tables มีอยู่แล้ว)
    public class MsSqlDbContext : DbContext
    {
        public MsSqlDbContext(DbContextOptions<MsSqlDbContext> options) : base(options) { }

        // TODO: เพิ่ม DbSet สำหรับแต่ละ table ใน MS SQL เช่น:
        // public DbSet<YourModel> YourTable { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // TODO: กำหนด mapping สำหรับ MS SQL tables ที่มีอยู่แล้ว
            // modelBuilder.Entity<YourModel>().ToTable("your_table_name");
        }
    }
}
