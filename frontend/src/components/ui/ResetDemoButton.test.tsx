import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/helpers/renderWithProviders';

const getDemoStatusMock = vi.fn();
const resetDemoDataMock = vi.fn();
vi.mock('../../features/demo/api/demoService', () => ({
  getDemoStatus: (...a: unknown[]) => getDemoStatusMock(...a),
  resetDemoData: (...a: unknown[]) => resetDemoDataMock(...a),
}));

const clearAuthSessionMock = vi.fn();
vi.mock('../../lib/auth', () => ({
  clearAuthSession: (...a: unknown[]) => clearAuthSessionMock(...a),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('react-toastify', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import ResetDemoButton from './ResetDemoButton';

beforeEach(() => {
  getDemoStatusMock.mockReset();
  resetDemoDataMock.mockReset();
  clearAuthSessionMock.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

const button = () => screen.getByRole('button', { name: /^reset demo$/i });

describe('ResetDemoButton — availability probe (per D-049)', () => {
  it('renders nothing when the status probe rejects (not a demo deployment)', async () => {
    getDemoStatusMock.mockRejectedValueOnce({ response: { status: 404 } });

    renderWithProviders(<ResetDemoButton />);

    await waitFor(() => expect(getDemoStatusMock).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /reset demo/i })).not.toBeInTheDocument();
  });

  it('renders the button when the status probe resolves', async () => {
    getDemoStatusMock.mockResolvedValueOnce(undefined);

    renderWithProviders(<ResetDemoButton />);

    expect(await screen.findByRole('button', { name: /^reset demo$/i })).toBeInTheDocument();
  });
});

describe('ResetDemoButton — confirmation (UI §3, §11.1)', () => {
  beforeEach(() => {
    getDemoStatusMock.mockResolvedValue(undefined);
  });

  it('clicking the button opens a confirm dialog and resets nothing yet', async () => {
    renderWithProviders(<ResetDemoButton />);
    const ue = userEvent.setup();

    await ue.click(await screen.findByRole('button', { name: /^reset demo$/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/reset demo data\?/i)).toBeInTheDocument();
    expect(screen.getByText(/you will be signed out/i)).toBeInTheDocument();
    expect(resetDemoDataMock).not.toHaveBeenCalled();
  });

  it('Cancel closes the dialog without resetting', async () => {
    renderWithProviders(<ResetDemoButton />);
    const ue = userEvent.setup();

    await ue.click(await screen.findByRole('button', { name: /^reset demo$/i }));
    await ue.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(resetDemoDataMock).not.toHaveBeenCalled();
    expect(clearAuthSessionMock).not.toHaveBeenCalled();
  });
});

describe('ResetDemoButton — confirmed reset', () => {
  beforeEach(() => {
    getDemoStatusMock.mockResolvedValue(undefined);
  });

  it('resets, toasts, and signs the clicker out (seed.sql drops RefreshTokens)', async () => {
    resetDemoDataMock.mockResolvedValueOnce(undefined);
    renderWithProviders(<ResetDemoButton />);
    const ue = userEvent.setup();

    await ue.click(await screen.findByRole('button', { name: /^reset demo$/i }));
    await ue.click(screen.getByRole('button', { name: /^reset demo data$/i }));

    await waitFor(() => expect(resetDemoDataMock).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith('Demo data reset');
    expect(clearAuthSessionMock).toHaveBeenCalledWith({ redirectToLogin: true });
  });

  it('on 409 shows "already running" and does NOT sign the clicker out', async () => {
    resetDemoDataMock.mockRejectedValueOnce({ response: { status: 409 } });
    renderWithProviders(<ResetDemoButton />);
    const ue = userEvent.setup();

    await ue.click(await screen.findByRole('button', { name: /^reset demo$/i }));
    await ue.click(screen.getByRole('button', { name: /^reset demo data$/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('A reset is already running'));
    expect(clearAuthSessionMock).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('on any other failure shows a generic error and keeps the session', async () => {
    resetDemoDataMock.mockRejectedValueOnce({ response: { status: 500 } });
    renderWithProviders(<ResetDemoButton />);
    const ue = userEvent.setup();

    await ue.click(await screen.findByRole('button', { name: /^reset demo$/i }));
    await ue.click(screen.getByRole('button', { name: /^reset demo data$/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Could not reset demo data'));
    expect(clearAuthSessionMock).not.toHaveBeenCalled();
  });
});
