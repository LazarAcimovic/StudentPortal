namespace StudentPortal.Handlers;

public static class PagingHelper
{
    private static readonly int[] AllowedPageSizes = [15, 20, 50];

    public static (int Page, int PageSize) Normalize(int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (!AllowedPageSizes.Contains(pageSize)) pageSize = 15;
        return (page, pageSize);
    }
}
