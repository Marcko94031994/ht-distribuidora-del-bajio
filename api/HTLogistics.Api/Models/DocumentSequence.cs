using System.ComponentModel.DataAnnotations;

namespace HTLogistics.Api.Models
{
    public class DocumentSequence
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string DocumentType { get; set; } // e.g. "Ingreso", "Egreso", "Pago"
        
        [Required]
        [MaxLength(20)]
        public string Serie { get; set; } // e.g. "A", "NC", "P"
        
        [Required]
        public int NextFolio { get; set; }
    }
}
