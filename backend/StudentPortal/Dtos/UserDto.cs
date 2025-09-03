namespace StudentPortal.Dtos
{
    public class UserDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string UserRole { get; set; }
        public string IndexNumber { get; set; }
        public bool IsDeleted { get; set; }
    }
}
