import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import SearchableCombobox from './SearchableCombobox';

type Item = { id: string; label: string };
const getLabel = (item: Item) => item.label;
const getId = (item: Item) => item.id;

let latestObserverCb: ((entries: Partial<IntersectionObserverEntry>[]) => void) | null = null;

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(cb: (entries: Partial<IntersectionObserverEntry>[]) => void) {
    latestObserverCb = cb;
  }
}

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  latestObserverCb = null;
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ── debounce ──────────────────────────────────────────────────────────────────

describe('SearchableCombobox (UI §11.8) — debounce', () => {
  it('does not fire fetchPage until 300 ms after the last keystroke', () => {
    vi.useFakeTimers();
    const fetchPage = vi.fn().mockResolvedValue({ items: [], totalCount: 0 });
    render(
      <SearchableCombobox
        value={null}
        onChange={vi.fn()}
        fetchPage={fetchPage}
        getLabel={getLabel}
        getId={getId}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fetchPage.mockClear();

    fireEvent.change(input, { target: { value: 'abc' } });
    expect(fetchPage).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(299); });
    expect(fetchPage).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(fetchPage).toHaveBeenCalledWith('abc', 1, expect.any(Object));
  });

  it('resets the debounce timer when the user types again before 300 ms', () => {
    vi.useFakeTimers();
    const fetchPage = vi.fn().mockResolvedValue({ items: [], totalCount: 0 });
    render(
      <SearchableCombobox
        value={null}
        onChange={vi.fn()}
        fetchPage={fetchPage}
        getLabel={getLabel}
        getId={getId}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fetchPage.mockClear();

    fireEvent.change(input, { target: { value: 'a' } });
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.change(input, { target: { value: 'ab' } });
    act(() => { vi.advanceTimersByTime(200); });
    expect(fetchPage).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(100); });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith('ab', 1, expect.any(Object));
  });
});

// ── append without duplicates ─────────────────────────────────────────────────

describe('SearchableCombobox (UI §11.8) — append without duplicates', () => {
  it('deduplicates items when appending the next page', async () => {
    const page1 = [{ id: '1', label: 'Alice' }, { id: '2', label: 'Bob' }];
    const page2 = [{ id: '2', label: 'Bob' }, { id: '3', label: 'Carol' }];
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ items: page1, totalCount: 3 })
      .mockResolvedValueOnce({ items: page2, totalCount: 3 });

    render(
      <SearchableCombobox
        value={null}
        onChange={vi.fn()}
        fetchPage={fetchPage}
        getLabel={getLabel}
        getId={getId}
      />,
    );

    fireEvent.focus(screen.getByRole('textbox'));
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    await act(async () => {
      latestObserverCb?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    await waitFor(() => expect(screen.getByText('Carol')).toBeInTheDocument());
    expect(screen.getAllByText('Bob')).toHaveLength(1);
  });
});

// ── query-change cancellation ─────────────────────────────────────────────────

describe('SearchableCombobox (UI §11.8) — query-change cancellation', () => {
  it('aborts the in-flight request when a new query fires', () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const fetchPage = vi.fn().mockImplementation((_q: string, _pg: number, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise(() => {});
    });

    render(
      <SearchableCombobox
        value={null}
        onChange={vi.fn()}
        fetchPage={fetchPage}
        getLabel={getLabel}
        getId={getId}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input); // initial fetch → signals[0]

    fireEvent.change(input, { target: { value: 'a' } });
    act(() => { vi.advanceTimersByTime(300); }); // 'a' fetch → signals[1]

    expect(signals).toHaveLength(2);
    expect(signals[1].aborted).toBe(false);

    fireEvent.change(input, { target: { value: 'ab' } });
    act(() => { vi.advanceTimersByTime(300); }); // 'ab' fetch aborts signals[1]

    expect(signals[1].aborted).toBe(true);
  });
});

// ── preserved selection ───────────────────────────────────────────────────────

describe('SearchableCombobox (UI §11.8) — preserved selection', () => {
  it('shows the selected label in the closed input when the item is not in the result list', () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], totalCount: 0 });
    render(
      <SearchableCombobox
        value={{ id: '42', label: 'Dr Smith' }}
        onChange={vi.fn()}
        fetchPage={fetchPage}
        getLabel={getLabel}
        getId={getId}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('Dr Smith');
  });

  it('restores the selected label after closing from a search that returned different items', async () => {
    const selected = { id: '42', label: 'Dr Smith' };
    const fetchPage = vi.fn().mockResolvedValue({
      items: [{ id: '1', label: 'Alice Jones' }],
      totalCount: 1,
    });

    render(
      <SearchableCombobox
        value={selected}
        onChange={vi.fn()}
        fetchPage={fetchPage}
        getLabel={getLabel}
        getId={getId}
      />,
    );

    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.focus(input); });
    await waitFor(() => expect(screen.getByText('Alice Jones')).toBeInTheDocument());

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('Dr Smith');
  });
});
