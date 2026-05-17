using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace eTPL.API.Models
{
    [Table("tbs_club_logo", Schema = "dbo")]
    public class ClubLogo
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("logo_name")]
        public string LogoName { get; set; } = string.Empty;

        [Required]
        [MaxLength(250)]
        [Column("file_name")]
        public string FileName { get; set; } = string.Empty;
    }
}
