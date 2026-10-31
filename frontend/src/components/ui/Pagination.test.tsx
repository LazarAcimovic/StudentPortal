import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

const defaults = {
  page: 1,
  pageSize: 5,
  totalItems: 12,
  pageSizeOptions: [5, 20, 50],
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
};

describe('Pagination (UI §11.7) — box 1: rendering', () => {
  it('renders a Bootstrap pagination list', () => {
    const { container } = render(<Pagination {...defaults} />);
    expect(container.querySelector('ul.pagination')).not.toBeNull();
  });

  it('renders a "Total: N" label with the correct count', () => {
    render(<Pagination {...defaults} totalItems={42} />);
    expect(screen.getByText('Total: 42')).toBeInTheDocument();
  });

  it('renders a "Rows per page:" label', () => {
    render(<Pagination {...defaults} />);
    expect(screen.getByText(/Rows per page:/i)).toBeInTheDocument();
  });

  it('renders a page-size <select> with the provided options', () => {
    render(<Pagination {...defaults} pageSizeOptions={[5, 20, 50]} pageSize={5} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    const options = Array.from((select as HTMLSelectElement).options).map(o => Number(o.value));
    expect(options).toEqual([5, 20, 50]);
  });

  it('the selected option in the <select> matches pageSize', () => {
    render(<Pagination {...defaults} pageSizeOptions={[5, 20, 50]} pageSize={20} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('20');
  });
});

describe('Pagination (UI §11.7) — box 2: visibility rule', () => {
  it('renders when totalItems === 1 (single-page, all items fit)', () => {
    const { container } = render(
      <Pagination {...defaults} totalItems={1} pageSize={5} page={1} />,
    );
    expect(container.querySelector('ul.pagination')).not.toBeNull();
    expect(screen.getByText('Total: 1')).toBeInTheDocument();
  });
});

describe('Pagination (UI §11.7) — box 3: prev/next and active page', () => {
  it('prev button is disabled on page 1', () => {
    render(<Pagination {...defaults} page={1} />);
    const prev = screen.getByRole('button', { name: /«/ });
    expect(prev).toBeDisabled();
  });

  it('next button is disabled on the last page', () => {
    // 12 items / 5 per page = 3 pages; page 3 is last
    render(<Pagination {...defaults} page={3} totalItems={12} pageSize={5} />);
    const next = screen.getByRole('button', { name: /»/ });
    expect(next).toBeDisabled();
  });

  it('active page is marked with the Bootstrap .active class', () => {
    const { container } = render(<Pagination {...defaults} page={2} />);
    const activeItem = container.querySelector('li.page-item.active');
    expect(activeItem).not.toBeNull();
    expect(activeItem?.querySelector('button')?.textContent).toBe('2');
  });

  it('both prev and next are disabled when everything fits on one page', () => {
    render(<Pagination {...defaults} totalItems={3} pageSize={5} page={1} />);
    expect(screen.getByRole('button', { name: /«/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /»/ })).toBeDisabled();
  });
});

describe('Pagination (UI §11.7) — box 4: page change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onPageChange with the clicked page number', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaults} page={1} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange(page + 1) when next is clicked', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaults} page={1} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: /»/ }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange(page - 1) when prev is clicked', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaults} page={2} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: /«/ }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});

describe('Pagination (UI §11.7) — box 5: size change', () => {
  it('calls onPageSizeChange with the new value when the select changes', async () => {
    const onPageSizeChange = vi.fn();
    render(<Pagination {...defaults} onPageSizeChange={onPageSizeChange} pageSize={5} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '20');
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });
});
