namespace StudentPortal.Dtos
{
    // Role is intentionally absent: a user's role is fixed at creation and cannot be
    // changed through the admin edit flow (deferred to a later MVP, per D-048).
    public class AdminUpdateUserDto
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string IndexNumber { get; set; }
        public bool IsDeleted { get; set; }
    }
}
