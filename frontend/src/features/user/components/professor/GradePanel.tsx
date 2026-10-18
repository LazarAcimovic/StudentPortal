import React from 'react';
import type { ProfessorStudentRow } from '../../models/professor/professorDashboard';

interface Props {
  selectedStudentRow: ProfessorStudentRow | null;
}

const GradePanel: React.FC<Props> = ({ selectedStudentRow }) => (
  <div className="col-lg-4">
    <div className="card h-100">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          {selectedStudentRow
            ? `Grade for ${selectedStudentRow.firstName} ${selectedStudentRow.lastName}`
            : 'Grade'}
        </h5>
      </div>
      <div className="card-body">
        {!selectedStudentRow ? (
          <p className="text-muted mb-0">Select a student to view or enter their grade.</p>
        ) : (
          <p className="text-muted mb-0">Loading grading panel…</p>
        )}
      </div>
    </div>
  </div>
);

export default GradePanel;
