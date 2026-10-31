type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export default function Pagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="d-flex align-items-center gap-3 flex-wrap">
      <span>Total: {totalItems}</span>

      <label className="d-flex align-items-center gap-2 mb-0">
        <span>Rows per page:</span>
        <select
          className="form-select form-select-sm w-auto"
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>

      <ul className="pagination mb-0">
        <li className={`page-item${page <= 1 ? ' disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            &laquo;
          </button>
        </li>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <li key={p} className={`page-item${p === page ? ' active' : ''}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          </li>
        ))}

        <li className={`page-item${page >= totalPages ? ' disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            &raquo;
          </button>
        </li>
      </ul>
    </div>
  );
}
