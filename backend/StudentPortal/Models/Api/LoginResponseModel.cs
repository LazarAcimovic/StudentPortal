namespace StudentPortal.Models.Api
{
    public class LoginResponseModel
    {
        public string? UserFirstName { get; set; }
        public string? UserLastName { get; set; }
        public string? AccessToken { get; set; }
        public int ExpiresIn { get; set; }
    }
}
