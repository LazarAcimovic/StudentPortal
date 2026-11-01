import { useState, useRef, useEffect } from 'react';

type SearchableComboboxProps<T> = {
  value: T | null;
  onChange: (item: T | null) => void;
  fetchPage: (query: string, page: number, signal: AbortSignal) => Promise<{ items: T[]; totalCount: number }>;
  getLabel: (item: T) => string;
  getId: (item: T) => string;
  placeholder?: string;
  isInvalid?: boolean;
};

export default function SearchableCombobox<T>({
  value,
  onChange,
  fetchPage,
  getLabel,
  getId,
  placeholder,
  isInvalid,
}: SearchableComboboxProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  function doFetch(q: string, pg: number) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    fetchPage(q, pg, controller.signal)
      .then(result => {
        if (pg === 1) {
          setItems(result.items);
        } else {
          setItems(prev => {
            const seen = new Set(prev.map(getId));
            return [...prev, ...result.items.filter(item => !seen.has(getId(item)))];
          });
        }
        setTotalCount(result.totalCount);
      })
      .catch(err => {
        if ((err as Error)?.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error('Failed to load results.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
  }

  function handleOpen() {
    if (isOpen) return;
    setIsOpen(true);
    const initialQuery = value ? getLabel(value) : '';
    setQuery(initialQuery);
    setPage(1);
    setItems([]);
    setTotalCount(0);
    doFetch(initialQuery, 1);
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setItems([]);
      doFetch(q, 1);
    }, 300);
  }

  function handleSelect(item: T) {
    onChange(item);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setIsOpen(false);
  }

  // Close when the user clicks outside the widget
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Append the next page when the sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !isOpen) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoading && items.length < totalCount) {
          const next = page + 1;
          setPage(next);
          doFetch(query, next);
        }
      },
      { threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen, isLoading, items.length, totalCount, page, query]);

  const displayValue = isOpen ? query : (value ? getLabel(value) : '');

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        className={`form-control${isInvalid ? ' is-invalid' : ''}`}
        placeholder={!isOpen ? placeholder : undefined}
        value={displayValue}
        onChange={handleQueryChange}
        onFocus={handleOpen}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div
          className="list-group"
          style={{ position: 'absolute', zIndex: 1000, width: '100%', maxHeight: '300px', overflowY: 'auto' }}
        >
          {error && (
            <div className="list-group-item text-danger">Failed to load results.</div>
          )}
          {!error && !isLoading && items.length === 0 && (
            <div className="list-group-item text-muted">No results.</div>
          )}
          {items.map(item => (
            <button
              key={getId(item)}
              type="button"
              className="list-group-item list-group-item-action"
              onClick={() => handleSelect(item)}
            >
              {getLabel(item)}
            </button>
          ))}
          {isLoading && (
            <div className="list-group-item text-center text-muted" role="status">
              Loading…
            </div>
          )}
          <div ref={sentinelRef} style={{ height: 1 }} />
        </div>
      )}
    </div>
  );
}
