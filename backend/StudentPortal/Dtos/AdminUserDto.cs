using StudentPortal.Models.Enums;

namespace StudentPortal.Dtos
{
    // Admin Users-list row. Unlike UserDto it carries IsDeleted, because the
    // admin Users tab renders an Active/Inactive status badge from it (PRD §5,
    // UI §8.1). This DTO is only ever returned from admin-authorised list
    // endpoints, never from self-facing responses (per D-035).
    public class AdminUserDto
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public RoleEnum UserRole { get; set; }
        public string IndexNumber { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
