import React, { useState } from 'react';
import type { AssignedCase, AssignedCasesSectionProps } from '../../models/professor/professorDashboard';
import AssignedCaseItem from './AssignedCaseItem';
import ResolveModal from './ResolveModal';

const AssignedCasesSection: React.FC<AssignedCasesSectionProps> = ({ assignedCases, onRefresh }) => {
  const [selectedCase, setSelectedCase] = useState<AssignedCase | null>(null);

  const renderCases = (layout: 'table' | 'card') =>
    assignedCases.map(c => (
      <AssignedCaseItem
        key={c.gradeId}
        assignedCase={c}
        layout={layout}
        onResolveClick={setSelectedCase}
      />
    ));

  return (
    <>
      <div className="card mt-4">
        <div className="card-header bg-warning text-dark">
          <h5 className="mb-0">Assigned Cases</h5>
        </div>
        <div className="card-body p-0">
          {!assignedCases.length ? (
            <p className="p-3 text-muted mb-0">No assigned cases.</p>
          ) : (
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <div className="table-responsive d-none d-sm-block">
                <table className="table table-hover align-middle mb-0">
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                    <tr>
                      <th>Subject</th>
                      <th>Student</th>
                      <th>Grade</th>
                      <th>Reason</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>{renderCases('table')}</tbody>
                </table>
              </div>

              <div className="d-sm-none p-2">{renderCases('card')}</div>
            </div>
          )}
        </div>
      </div>

      <ResolveModal
        assignedCase={selectedCase}
        open={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        onResolved={() => {
          setSelectedCase(null);
          onRefresh();
        }}
      />
    </>
  );
};

export default AssignedCasesSection;
