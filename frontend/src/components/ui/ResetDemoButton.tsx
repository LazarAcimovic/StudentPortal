import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Modal from "./Modal";
import { getDemoStatus, resetDemoData } from "../../features/demo/api/demoService";
import { clearAuthSession } from "../../lib/auth";

/**
 * Navbar entry for the portfolio demo deployment (UI §3, PRD §7.1, per D-049).
 *
 * Renders nothing unless the backend answers `GET /api/Demo/status` with a 200, so the
 * button cannot appear on a deployment whose `DemoMode:Enabled` flag is off — the backend
 * is the single source of truth and no build-time flag can disagree with it.
 *
 * A reset replays `seed.sql`, which deletes `Users` and so cascades `RefreshTokens` away:
 * every session dies, the clicker's included. That is unavoidable without touching the
 * fixture the integration suite depends on, so it is stated up front in the confirm modal
 * and followed by a deliberate sign-out rather than left to surface as a stray 401.
 */
export default function ResetDemoButton() {
  const [available, setAvailable] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getDemoStatus(controller.signal)
      .then(() => setAvailable(true))
      .catch(() => {
        // 404 (or anything else) ⇒ not a demo deployment; the button stays hidden.
      });
    return () => controller.abort();
  }, []);

  if (!available) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await resetDemoData();
      toast.success("Demo data reset");
      setConfirmOpen(false);
      await clearAuthSession({ redirectToLogin: true });
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast.error(
        status === 409
          ? "A reset is already running"
          : "Could not reset demo data"
      );
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* btn-sm with py-2 px-3 keeps the tap target at 44 px (UI §12.4). On xs the whole
          navbar collapses, so this sits inside the toggler menu at full width. */}
      <li className="nav-item mb-2 mb-lg-0 me-lg-2">
        <button
          type="button"
          className="btn btn-outline-light btn-sm py-2 px-3"
          onClick={() => setConfirmOpen(true)}
        >
          Reset demo
        </button>
      </li>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset demo data?"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirm}
              disabled={busy}
            >
              {busy ? "Resetting…" : "Reset demo data"}
            </button>
          </>
        }
      >
        <p className="mb-2">
          This restores every user, subject, grade and appeal to its original state.
          Anything you or other visitors changed is discarded.
        </p>
        <p className="mb-0">
          You will be signed out. Sign back in with any of the published demo credentials.
        </p>
      </Modal>
    </>
  );
}
