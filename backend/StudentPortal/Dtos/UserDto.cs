using StudentPortal.Models.Enums;

namespace StudentPortal.Dtos
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public RoleEnum UserRole { get; set; }
        public string IndexNumber { get; set; }
        // NOTE: IsDeleted is deliberately absent — self-facing responses (Me,
        // profile, admin single-user update) must not leak a user's soft-delete
        // state. The admin Users list uses AdminUserDto, which carries it for the
        // status badge (per D-035).
        public DateTime CreatedAt { get; set; }
    }
}
