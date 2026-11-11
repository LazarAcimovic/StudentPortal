namespace StudentPortal.Exceptions
{
    public class EmailAlreadyExistsException : ConflictException
    {
        public EmailAlreadyExistsException(string message) : base(message) { }
    }
}
