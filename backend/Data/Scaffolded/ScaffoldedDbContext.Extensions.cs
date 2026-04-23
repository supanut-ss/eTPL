using Microsoft.EntityFrameworkCore;
using eTPL.API.Models.Scaffolded;

namespace eTPL.API.Data.Scaffolded
{
    public partial class ScaffoldedDbContext
    {
        public virtual DbSet<TbsPrizeSetting> TbsPrizeSettings { get; set; }
    }
}
