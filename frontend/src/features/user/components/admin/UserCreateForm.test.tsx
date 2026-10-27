import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserCreateForm from './UserCreateForm';

function renderForm() {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(<UserCreateForm onSave={onSave} onCancel={onCancel} />);
  return { onSave, onCancel };
}

describe('UserCreateForm password field (UI §8.3)', () => {
  it('renders the password field as type=password by default', () => {
    renderForm();
    const input = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  it('password field has autoComplete="new-password"', () => {
    renderForm();
    const input = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(input).toHaveAttribute('autoComplete', 'new-password');
  });

  it('show/hide toggle button starts with aria-label "Show password"', () => {
    renderForm();
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('clicking the toggle reveals the password and flips aria-label to "Hide password"', async () => {
    const ue = userEvent.setup();
    renderForm();
    await ue.click(screen.getByRole('button', { name: 'Show password' }));
    const input = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });
});
