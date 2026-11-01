import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import { resetUserStore } from '../../test/helpers/renderWithProviders';
import { makeProfessor } from '../../test/factories';
import { useUserStore } from '../../store/user/useUserStore';

function Thrower(): never {
  throw new Error('test render error');
}

describe('ErrorBoundary (per D-033)', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders children normally when no error occurs', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <p>child content</p>
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('shows the fallback when a child throws during render', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Thrower />
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  });

  it('shows reload and go-home options in the fallback', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Thrower />
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go home/i })).toBeInTheDocument();
  });

  it('renders the fallback when used with no children (errorElement mode)', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  });

  it('does not clear auth state when a child throws', () => {
    resetUserStore(makeProfessor());
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Thrower />
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(useUserStore.getState().currentUser).not.toBeNull();
  });
});
