import React, { useState, useEffect } from 'react';
import { useProfessorDashboard } from '../../grades/hooks/useProfessorDashboard';
import { useProfessorStudents } from '../../grades/hooks/useProfessorStudents';
import type { ProfessorSubject, ProfessorStudentRow } from '../models/professor/professorDashboard';
import {
  PROFESSOR_SELECTED_SUBJECT_ID_INITIAL,
} from '../constants/professor/constants';
import SubjectsList from '../components/professor/SubjectsList';
import StudentsList from '../components/professor/StudentsList';
import GradePanel from '../components/professor/GradePanel';
import AppealsSection from '../components/professor/AppealsSection';
import AssignedCasesSection from '../components/professor/AssignedCasesSection';

const ProfessorDashboardPage: React.FC = () => {
  const { data, isLoading, error, refresh } = useProfessorDashboard();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(PROFESSOR_SELECTED_SUBJECT_ID_INITIAL);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);

  const {
    items: pagedStudents,
    totalCount,
    page,
    pageSize,
    pageSizeOptions,
    isLoading: studentsLoading,
    loadPage,
  } = useProfessorStudents();

  const selectedSubject: ProfessorSubject | null =
    data?.subjects.find(s => s.subjectId === selectedSubjectId) ?? null;

  const selectedStudentRow: ProfessorStudentRow | null =
    pagedStudents.find(s => s.enrollmentId === selectedEnrollmentId) ?? null;

  useEffect(() => {
    if (!selectedSubjectId) return;
    const controller = new AbortController();
    void loadPage(selectedSubjectId, 1, pageSize, controller.signal);
    setSelectedEnrollmentId(null);
    return () => controller.abort();
    // loadPage is stable (useCallback with []); pageSize here is the current page size when the subject changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId, loadPage]);

  const handleSubjectClick = (subject: ProfessorSubject) => {
    setSelectedSubjectId(subject.subjectId);
  };

  const handleStudentClick = (student: ProfessorStudentRow) => {
    setSelectedEnrollmentId(student.enrollmentId);
  };

  const handlePageChange = (newPage: number) => {
    if (!selectedSubjectId) return;
    const controller = new AbortController();
    void loadPage(selectedSubjectId, newPage, pageSize, controller.signal);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (!selectedSubjectId) return;
    const controller = new AbortController();
    void loadPage(selectedSubjectId, 1, newPageSize, controller.signal);
  };

  if (isLoading) {
    return (
      <div className="container my-4 text-center">
        <span className="spinner-border" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container my-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <h1 className="mb-4">Professor Dashboard</h1>

      <div className="row g-3">
        <SubjectsList
          subjects={data?.subjects ?? []}
          selectedSubjectId={selectedSubjectId}
          onSubjectClick={handleSubjectClick}
        />
        <StudentsList
          subjectName={selectedSubject?.subjectName ?? null}
          students={pagedStudents}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          isLoading={studentsLoading}
          selectedStudentRow={selectedStudentRow}
          onStudentClick={handleStudentClick}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
        <GradePanel selectedStudentRow={selectedStudentRow} onGradeChanged={refresh} />
      </div>

      <AppealsSection appeals={data?.appeals ?? []} onRefresh={refresh} />
      <AssignedCasesSection assignedCases={data?.assignedCases ?? []} onRefresh={refresh} />
    </div>
  );
};

export default ProfessorDashboardPage;
