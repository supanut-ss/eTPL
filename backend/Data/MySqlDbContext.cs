using Microsoft.EntityFrameworkCore;

namespace eTPL.API.Data
{
    // DbContext สำหรับ MySQL — สำหรับ business data อื่นๆ (ถ้ามีในอนาคต)
    public class MySqlDbContext : DbContext
    {
        public MySqlDbContext(DbContextOptions<MySqlDbContext> options) : base(options) { }

        // TODO: เพิ่ม DbSet สำหรับ MySQL tables ที่นี่ (ถ้ามี)

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // TODO: กำหนด mapping สำหรับ MySQL tables
        }
    }
}
