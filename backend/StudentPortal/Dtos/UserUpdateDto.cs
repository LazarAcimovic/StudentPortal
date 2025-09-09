using StudentPortal.Models.Enums;

namespace StudentPortal.Dtos
{
    public class UserUpdateDto
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public RoleEnum UserRole { get; set; } //only if admin

        public string Email { get; set; } // only allowed if admin
        public bool IsDeleted { get; set; } //only if admin
    }
}
