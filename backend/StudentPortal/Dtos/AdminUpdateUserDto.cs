using StudentPortal.Models.Enums;

namespace StudentPortal.Dtos
{
    public class AdminUpdateUserDto
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string IndexNumber { get; set; }
        public RoleEnum UserRole { get; set; }
        public bool IsDeleted { get; set; }
    }
}
