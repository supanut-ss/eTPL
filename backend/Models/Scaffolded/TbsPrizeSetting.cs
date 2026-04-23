using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models.Scaffolded
{
    [Table("tbs_prize_setting", Schema = "dbo")]
    public class TbsPrizeSetting
    {
        [Key]
        [Column("ID")]
        public int Id { get; set; }

        [Column("RANK_LABEL")]
        [MaxLength(100)]
        public string RankLabel { get; set; } = string.Empty;

        [Column("AMOUNT", TypeName = "decimal(18, 2)")]
        public decimal Amount { get; set; }

        [Column("SORT_ORDER")]
        public int SortOrder { get; set; }

        [Column("POSITION_START")]
        public int? PositionStart { get; set; }

        [Column("POSITION_END")]
        public int? PositionEnd { get; set; }
    }
}
