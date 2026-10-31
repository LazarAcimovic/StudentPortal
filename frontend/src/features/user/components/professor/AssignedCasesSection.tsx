import React, { useState } from 'react';
import type { AssignedCase, AssignedCasesSectionProps } from '../../models/professor/professorDashboard';
import AssignedCaseItem from './AssignedCaseItem';
import ResolveModal from './ResolveModal';
import Pagination from '../../../../components/ui/Pagination';

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 20, 50];

function AssignedCasesSection({ assignedCases, onRefresh }: AssignedCasesSectionProps) {
  const [selectedCase, setSelectedCase] = useState<AssignedCase | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const start = (page - 1) * pageSize;
  const visibleCases = assignedCases.slice(start, start + pageSize);

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  const renderCases = (layout: 'table' | 'card') =>
    visibleCases.map(c => (
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
            <>
              <div className="table-responsive d-none d-sm-block">
                <table className="table table-hover align-middle mb-0">
                  <thead>
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

              <div className="p-3 pt-2">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={assignedCases.length}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            </>
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
}

export default AssignedCasesSection;
