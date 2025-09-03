namespace StudentPortal.Dtos
{
    public class UserCreateDto
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string UserPassword { get; set; }
        public string IndexNumber { get; set; } //null if professor
        public string UserRole { get; set; } //is user is admin, else disabled
    }
}
