import React, { useState, useEffect, useCallback } from "react";
import { createEnrollment, getAllEnrollments } from "../../../subjects/api/enrollmentService";
import type { CreateEnrollmentResult } from "../../../subjects/api/enrollmentService";
import type { Enrollment, CreateEnrollment } from "../../../subjects/models/enrollment";
import EnrollmentsTable from "./EnrollmentsTable";
import EnrollmentCreateForm from "./EnrollmentCreateForm";
import Pagination from "../../../../components/ui/Pagination";

const PAGE_SIZE_OPTIONS = [15, 20, 50];
const DEFAULT_PAGE_SIZE = 15;

const EnrollmentsTabPanel: React.FC = () => {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isCreating, setIsCreating] = useState(false);

  const fetchPage = useCallback(async (p: number, ps: number) => {
    const result = await getAllEnrollments(p, ps);
    if (result) {
      setItems(result.items);
      setTotalCount(result.totalCount);
    }
  }, []);

  useEffect(() => {
    void fetchPage(1, DEFAULT_PAGE_SIZE);
  }, [fetchPage]);

  const handleCreate = async (newEnrollment: CreateEnrollment): Promise<CreateEnrollmentResult> => {
    const result = await createEnrollment(newEnrollment);
    if (result.ok) {
      setIsCreating(false);
      await fetchPage(page, pageSize);
    }
    return result;
  };

  const handlePageChange = async (p: number) => {
    setPage(p);
    await fetchPage(p, pageSize);
  };

  const handlePageSizeChange = async (ps: number) => {
    setPage(1);
    setPageSize(ps);
    await fetchPage(1, ps);
  };

  return (
    <>
      <h3>Student Enrollments</h3>
      {isCreating ? (
        <EnrollmentCreateForm
          onSave={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      ) : (
        <>
          <div className="d-flex justify-content-end mb-3">
            <button
              className="btn btn-success"
              onClick={() => setIsCreating(true)}
            >
              Create New Enrollment
            </button>
          </div>
          <EnrollmentsTable enrollments={items} />
          {totalCount >= 1 && (
            <div className="mt-3">
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={totalCount}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </>
      )}
    </>
  );
};

export default EnrollmentsTabPanel;
