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

    public static (int Page, int PageSize) NormalizeSearch(int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 15;
        if (pageSize > 50) pageSize = 50;
        return (page, pageSize);
    }
}
