namespace StudentPortal.Dtos;

public class UserSearchResultDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? IndexNumber { get; set; }
}
