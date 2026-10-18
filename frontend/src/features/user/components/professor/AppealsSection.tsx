import React from 'react';
import type { ProfessorAppealRow } from '../../../grades/models/professorDashboard';
import { APPEAL_STATUS_BADGE } from '../../constants/professor/constants';

interface Props {
  appeals: ProfessorAppealRow[];
}

function AppealItem({ appeal, layout }: { appeal: ProfessorAppealRow; layout: 'table' | 'card' }) {
  const statusBadge = APPEAL_STATUS_BADGE[appeal.status] ?? (
    <span className="badge bg-secondary">{appeal.status}</span>
  );

  if (layout === 'table') {
    return (
      <tr key={appeal.appealId}>
        <td>
          {appeal.studentFirstName} {appeal.studentLastName}
        </td>
        <td>{appeal.subjectName}</td>
        <td>{new Date(appeal.submittedAt).toLocaleDateString()}</td>
        <td>{statusBadge}</td>
        <td className="text-end">
          <button className="btn btn-outline-primary btn-sm">View appeal</button>
        </td>
      </tr>
    );
  }

  return (
    <div key={appeal.appealId} className="card mb-2">
      <div className="card-body">
        <div className="fw-bold">
          {appeal.studentFirstName} {appeal.studentLastName}
        </div>
        <div className="text-muted small">{appeal.subjectName}</div>
        <div className="my-1">{statusBadge}</div>
        <div className="text-muted small mb-2">
          {new Date(appeal.submittedAt).toLocaleDateString()}
        </div>
        <button className="btn btn-outline-primary btn-sm w-100">View appeal</button>
      </div>
    </div>
  );
}

const AppealsSection: React.FC<Props> = ({ appeals }) => (
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
                  <AppealItem key={appeal.appealId} appeal={appeal} layout="table" />
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-sm-none p-2">
            {appeals.map(appeal => (
              <AppealItem key={appeal.appealId} appeal={appeal} layout="card" />
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

export default AppealsSection;
