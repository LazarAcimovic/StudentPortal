namespace StudentPortal.Dtos
{
    public class UserUpdateDto
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string UserRole { get; set; } //only if admin
        public string UserPassword { get; set; }

        public string Email { get; set; } // only allowed if admin
        public bool IsDeleted { get; set; } //only if admin
    }
}
