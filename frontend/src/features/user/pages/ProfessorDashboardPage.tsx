import React, { useState } from 'react';
import { useProfessorDashboard } from '../../grades/hooks/useProfessorDashboard';
import type { ProfessorSubject, ProfessorStudentRow } from '../models/professor/professorDashboard';
import {
  PROFESSOR_SELECTED_SUBJECT_ID_INITIAL,
  PROFESSOR_SELECTED_STUDENT_ROW_INITIAL,
} from '../constants/professor/constants';
import SubjectsList from '../components/professor/SubjectsList';
import StudentsList from '../components/professor/StudentsList';
import GradePanel from '../components/professor/GradePanel';
import AppealsSection from '../components/professor/AppealsSection';

const ProfessorDashboardPage: React.FC = () => {
  const { data, isLoading, error } = useProfessorDashboard();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(PROFESSOR_SELECTED_SUBJECT_ID_INITIAL);
  const [selectedStudentRow, setSelectedStudentRow] = useState<ProfessorStudentRow | null>(PROFESSOR_SELECTED_STUDENT_ROW_INITIAL);

  const selectedSubject: ProfessorSubject | null =
    data?.subjects.find(s => s.subjectId === selectedSubjectId) ?? null;

  const handleSubjectClick = (subject: ProfessorSubject) => {
    setSelectedSubjectId(subject.subjectId);
    setSelectedStudentRow(null);
  };

  const handleStudentClick = (student: ProfessorStudentRow) => {
    setSelectedStudentRow(student);
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
        <GradePanel selectedStudentRow={selectedStudentRow} />
      </div>

      <AppealsSection appeals={data?.appeals ?? []} />
    </div>
  );
};

export default ProfessorDashboardPage;
