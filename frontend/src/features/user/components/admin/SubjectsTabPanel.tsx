import React, { useState, useEffect, useCallback } from "react";
import { getAllSubjects, createSubject, updateSubject } from "../../../subjects/api/subjectService";
import type { CreateSubjectResult, UpdateSubjectResult } from "../../../subjects/api/subjectService";
import type { Subject, CreateSubject, UpdateSubject } from "../../../subjects/models/subject";
import SubjectsTable from "./SubjectsTable";
import SubjectEditForm from "./SubjectEditForm";
import SubjectCreateForm from "./SubjectCreateForm";
import Pagination from "../../../../components/ui/Pagination";

const PAGE_SIZE_OPTIONS = [15, 20, 50];
const DEFAULT_PAGE_SIZE = 15;

const SubjectsTabPanel: React.FC = () => {
  const [items, setItems] = useState<Subject[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchPage = useCallback(async (p: number, ps: number) => {
    const result = await getAllSubjects(p, ps);
    if (result) {
      setItems(result.items);
      setTotalCount(result.totalCount);
    }
  }, []);

  useEffect(() => {
    void fetchPage(1, DEFAULT_PAGE_SIZE);
  }, [fetchPage]);

  const handleCreate = async (newSubject: CreateSubject): Promise<CreateSubjectResult> => {
    const result = await createSubject(newSubject);
    if (result.ok) {
      setIsCreating(false);
      await fetchPage(page, pageSize);
    }
    return result;
  };

  const handleUpdate = async (updatedSubject: UpdateSubject): Promise<UpdateSubjectResult> => {
    const result = await updateSubject(updatedSubject);
    if (result.ok) {
      setEditingSubject(null);
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
      <h3>Manage Subjects</h3>
      {isCreating ? (
        <SubjectCreateForm
          onSave={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      ) : editingSubject ? (
        <SubjectEditForm
          subject={editingSubject}
          onSave={handleUpdate}
          onCancel={() => setEditingSubject(null)}
        />
      ) : (
        <>
          <div className="d-flex justify-content-end mb-3">
            <button
              className="btn btn-success"
              onClick={() => setIsCreating(true)}
            >
              Create New Subject
            </button>
          </div>
          <SubjectsTable
            subjects={items}
            onStartEdit={(subjectToEdit) => setEditingSubject(subjectToEdit)}
          />
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

export default SubjectsTabPanel;
