import React, { useState, useEffect } from 'react';
import type { ProfessorAppealRow, AppealsSectionProps } from '../../models/professor/professorDashboard';
import { APPEAL_STATUS_BADGE } from '../../constants/professor/constants';
import ViewAppealModal from './ViewAppealModal';
import { undoDenyAppeal } from '../../../appeals/api/appealService';
import { formatCountdown } from '../../util/gradeUtils';

function useCountdown(deadline: string | null): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!deadline) { setLabel(''); return; }

    const compute = () => setLabel(formatCountdown(deadline));

    compute();
    const id = setInterval(compute, 30000);
    return () => clearInterval(id);
  }, [deadline]);

  return label;
}

function UndoButton({
  appeal,
  onUndoDone,
}: {
  appeal: ProfessorAppealRow;
  onUndoDone: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const countdown = useCountdown(appeal.undoDenyDeadline);

  const handleUndo = async () => {
    setIsSubmitting(true);
    try {
      await undoDenyAppeal(appeal.appealId);
      onUndoDone();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="d-flex align-items-center gap-1 flex-wrap justify-content-end">
      <span className="text-muted small">{countdown}</span>
      <button
        className="btn btn-outline-warning btn-sm"
        onClick={handleUndo}
        disabled={isSubmitting}
      >
        {isSubmitting ? <span className="spinner-border spinner-border-sm me-1" role="status" /> : null}
        Undo
      </button>
    </div>
  );
}

function AppealItem({
  appeal,
  layout,
  onViewClick,
  onUndoDone,
}: {
  appeal: ProfessorAppealRow;
  layout: 'table' | 'card';
  onViewClick: (appeal: ProfessorAppealRow) => void;
  onUndoDone: () => void;
}) {
  const statusBadge = APPEAL_STATUS_BADGE[appeal.status] ?? (
    <span className="badge bg-secondary">{appeal.status}</span>
  );

  const canUndo = appeal.status === 'Denied' && appeal.canUndoDeny;

  if (layout === 'table') {
    return (
      <tr>
        <td>
          {appeal.studentFirstName} {appeal.studentLastName}
        </td>
        <td>{appeal.subjectName}</td>
        <td>{new Date(appeal.submittedAt).toLocaleDateString()}</td>
        <td>{statusBadge}</td>
        <td className="text-end">
          <div className="d-flex align-items-center justify-content-end gap-2 flex-wrap">
            {canUndo && (
              <UndoButton appeal={appeal} onUndoDone={onUndoDone} />
            )}
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => onViewClick(appeal)}
            >
              View appeal
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="card mb-2">
      <div className="card-body">
        <div className="fw-bold">
          {appeal.studentFirstName} {appeal.studentLastName}
        </div>
        <div className="text-muted small">{appeal.subjectName}</div>
        <div className="my-1">{statusBadge}</div>
        <div className="text-muted small mb-2">
          {new Date(appeal.submittedAt).toLocaleDateString()}
        </div>
        <div className="d-flex flex-column gap-2">
          {canUndo && (
            <UndoButton appeal={appeal} onUndoDone={onUndoDone} />
          )}
          <button
            className="btn btn-outline-primary btn-sm w-100"
            onClick={() => onViewClick(appeal)}
          >
            View appeal
          </button>
        </div>
      </div>
    </div>
  );
}

const AppealsSection: React.FC<AppealsSectionProps> = ({ appeals, onRefresh }) => {
  const [selectedAppeal, setSelectedAppeal] = useState<ProfessorAppealRow | null>(null);

  return (
    <>
      <div className="card mt-4">
        <div className="card-header bg-info text-dark">
          <h5 className="mb-0">Appeals</h5>
        </div>
        <div className="card-body p-0">
          {!appeals.length ? (
            <p className="p-3 text-muted mb-0">No pending or overdue appeals.</p>
          ) : (
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <div className="table-responsive d-none d-sm-block">
                <table className="table table-hover align-middle mb-0">
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                    <tr>
                      <th>Student</th>
                      <th>Subject</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appeals.map(appeal => (
                      <AppealItem
                        key={appeal.appealId}
                        appeal={appeal}
                        layout="table"
                        onViewClick={setSelectedAppeal}
                        onUndoDone={onRefresh}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-sm-none p-2">
                {appeals.map(appeal => (
                  <AppealItem
                    key={appeal.appealId}
                    appeal={appeal}
                    layout="card"
                    onViewClick={setSelectedAppeal}
                    onUndoDone={onRefresh}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ViewAppealModal
        appeal={selectedAppeal}
        allAppeals={appeals}
        open={selectedAppeal !== null}
        onClose={() => setSelectedAppeal(null)}
        onActionDone={() => {
          setSelectedAppeal(null);
          onRefresh();
        }}
      />
    </>
  );
};

export default AppealsSection;
