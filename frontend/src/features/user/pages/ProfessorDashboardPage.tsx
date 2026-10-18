import React, { useState } from 'react';
import { useProfessorDashboard } from '../../grades/hooks/useProfessorDashboard';
import type { ProfessorSubject, ProfessorStudentRow } from '../models/professor/professorDashboard';
import {
  PROFESSOR_SELECTED_SUBJECT_ID_INITIAL,
} from '../constants/professor/constants';
import SubjectsList from '../components/professor/SubjectsList';
import StudentsList from '../components/professor/StudentsList';
import GradePanel from '../components/professor/GradePanel';
import AppealsSection from '../components/professor/AppealsSection';

const ProfessorDashboardPage: React.FC = () => {
  const { data, isLoading, error, refresh } = useProfessorDashboard();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(PROFESSOR_SELECTED_SUBJECT_ID_INITIAL);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);

  const selectedSubject: ProfessorSubject | null =
    data?.subjects.find(s => s.subjectId === selectedSubjectId) ?? null;

  const selectedStudentRow: ProfessorStudentRow | null =
    selectedSubject?.students.find(s => s.enrollmentId === selectedEnrollmentId) ?? null;

  const handleSubjectClick = (subject: ProfessorSubject) => {
    setSelectedSubjectId(subject.subjectId);
    setSelectedEnrollmentId(null);
  };

  const handleStudentClick = (student: ProfessorStudentRow) => {
    setSelectedEnrollmentId(student.enrollmentId);
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
          selectedSubject={selectedSubject}
          selectedStudentRow={selectedStudentRow}
          onStudentClick={handleStudentClick}
        />
        <GradePanel selectedStudentRow={selectedStudentRow} onGradeChanged={refresh} />
      </div>

      <AppealsSection appeals={data?.appeals ?? []} />
    </div>
  );
};

export default ProfessorDashboardPage;
