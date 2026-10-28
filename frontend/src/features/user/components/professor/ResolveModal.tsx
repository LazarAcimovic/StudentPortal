import { useState } from 'react';
import type { AssignedCase } from '../../models/professor/professorDashboard';
import Modal from '../../../../components/ui/Modal';
import { REASON_LABEL } from '../../constants/professor/constants';
import AppealHistory from './AppealHistory';
import ScenarioAPanel from './ScenarioAPanel';
import ScenarioBPanel from './ScenarioBPanel';

function ResolveModal({
  assignedCase,
  open,
  onClose,
  onResolved,
}: {
  assignedCase: AssignedCase | null;
  open: boolean;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [acceptedInSession, setAcceptedInSession] = useState(false);

  const handleSuccess = () => {
    setError(null);
    setAcceptedInSession(false);
    onClose();
    onResolved();
  };

  const handleError = (msg: string) => setError(msg);

  const handleAccepted = () => {
    setError(null);
    setAcceptedInSession(true);
  };

  const handleClose = () => {
    setError(null);
    setAcceptedInSession(false);
    if (acceptedInSession) {
      onResolved();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Resolve Assigned Case"
      size="lg"
      blurBackdrop
    >
      {assignedCase && (
        <>
          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <div className="mb-3 small text-muted">
            <strong>{assignedCase.subjectName}</strong>
            {' — '}
            {assignedCase.studentFirstName} {assignedCase.studentLastName}
            {' · '}
            Final grade: <strong>{assignedCase.finalGrade}</strong>
          </div>

          <div className="mb-3">
            <span className="badge bg-warning text-dark">
              {REASON_LABEL[assignedCase.reason] ?? assignedCase.reason}
            </span>
          </div>

          <AppealHistory appeals={assignedCase.appeals} />

          <hr className="my-3" />

          {assignedCase.reason === 'AcceptedUnresolved' || acceptedInSession ? (
            <ScenarioAPanel
              assignedCase={assignedCase}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          ) : (
            <ScenarioBPanel
              assignedCase={assignedCase}
              onSuccess={handleSuccess}
              onError={handleError}
              onAccepted={handleAccepted}
            />
          )}
        </>
      )}
    </Modal>
  );
}

export default ResolveModal;
