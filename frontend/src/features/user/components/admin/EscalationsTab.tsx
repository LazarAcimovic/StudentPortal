import React, { useState } from 'react';
import Pagination from '../../../../components/ui/Pagination';
import { useEscalations } from '../../../escalations/hooks/useEscalations';
import { EscalationsTable } from './EscalationsTable';
import { AssignModal } from './AssignModal';
import type { EscalatedCase } from '../../../escalations/models/escalation';

const PAGE_SIZE_OPTIONS = [15, 20, 50];

const EscalationsTab: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const { cases, totalCount, isLoading, error } = useEscalations(page, pageSize);
  const [selectedCase, setSelectedCase] = useState<EscalatedCase | null>(null);
  const [caseList, setCaseList] = useState<EscalatedCase[]>([]);

  React.useEffect(() => {
    setCaseList(cases);
  }, [cases]);

  const handleConfirmed = (updated: EscalatedCase) => {
    setCaseList(prev => prev.map(c => c.gradeId === updated.gradeId ? updated : c));
    setSelectedCase(null);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPage(1);
    setPageSize(newSize);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <span className="spinner-border" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error.message}</div>;
  }

  return (
    <>
      <h3>Escalations</h3>
      <EscalationsTable cases={caseList} onActionClick={setSelectedCase} />
      {caseList.length > 0 && totalPages > 1 && (
        <div className="mt-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalCount}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
      <AssignModal
        escalatedCase={selectedCase}
        open={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        onConfirmed={handleConfirmed}
      />
    </>
  );
};

export default EscalationsTab;
