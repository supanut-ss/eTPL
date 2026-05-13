using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models
{
    [Table("tbm_qa_information")]
    public class QaInformation
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("question")]
        [MaxLength(500)]
        public string Question { get; set; } = null!;

        [Column("answer")]
        public string Answer { get; set; } = null!;
    }
}
