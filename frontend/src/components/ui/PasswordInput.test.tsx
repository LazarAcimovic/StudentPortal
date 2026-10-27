import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordInput from './PasswordInput';

function renderPasswordInput(overrides?: Partial<React.ComponentProps<typeof PasswordInput>>) {
  const defaults = {
    id: 'pw',
    name: 'password',
    value: '',
    onChange: vi.fn(),
    autoComplete: 'current-password' as const,
  };
  return render(<PasswordInput {...defaults} {...overrides} />);
}

describe('PasswordInput (UI §11.2)', () => {
  it('renders an input-group wrapper', () => {
    const { container } = renderPasswordInput();
    expect(container.querySelector('.input-group')).not.toBeNull();
  });

  it('renders the input as type=password by default', () => {
    renderPasswordInput({ id: 'pw' });
    const input = document.getElementById('pw') as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  it('toggle button has aria-label "Show password" when password is hidden', () => {
    renderPasswordInput();
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('clicking toggle shows the password and changes aria-label to "Hide password"', async () => {
    const ue = userEvent.setup();
    renderPasswordInput({ id: 'pw2' });
    await ue.click(screen.getByRole('button', { name: 'Show password' }));
    const input = document.getElementById('pw2') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  it('clicking toggle again hides the password and restores aria-label', async () => {
    const ue = userEvent.setup();
    renderPasswordInput({ id: 'pw3' });
    const btn = screen.getByRole('button', { name: 'Show password' });
    await ue.click(btn);
    await ue.click(screen.getByRole('button', { name: 'Hide password' }));
    const input = document.getElementById('pw3') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('toggle button has type="button" so it does not submit forms', () => {
    renderPasswordInput();
    const btn = screen.getByRole('button', { name: 'Show password' });
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('adds is-invalid class to the input when isInvalid=true', () => {
    renderPasswordInput({ id: 'pw4', isInvalid: true });
    const input = document.getElementById('pw4') as HTMLInputElement;
    expect(input).toHaveClass('is-invalid');
  });

  it('does not add is-invalid class when isInvalid is not set', () => {
    renderPasswordInput({ id: 'pw5' });
    const input = document.getElementById('pw5') as HTMLInputElement;
    expect(input).not.toHaveClass('is-invalid');
  });

  it('calls onChange when the user types', async () => {
    const ue = userEvent.setup();
    const onChange = vi.fn();
    renderPasswordInput({ id: 'pw6', onChange });
    const input = document.getElementById('pw6') as HTMLInputElement;
    await ue.type(input, 'secret');
    expect(onChange).toHaveBeenCalled();
  });

  it('calls onBlur when the input loses focus', async () => {
    const ue = userEvent.setup();
    const onBlur = vi.fn();
    renderPasswordInput({ id: 'pw7', onBlur });
    const input = document.getElementById('pw7') as HTMLInputElement;
    await ue.click(input);
    await ue.tab();
    expect(onBlur).toHaveBeenCalled();
  });
});
