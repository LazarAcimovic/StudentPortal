import React from 'react';
import type { StudentDashboardStats } from '../../models/studentDashboard';

interface Props {
  stats: StudentDashboardStats;
}

const StudyStatsCard: React.FC<Props> = ({ stats }) => (
  <div className="card mb-4">
    <div className="card-header bg-success text-white">
      <h5 className="mb-0">Study Statistics</h5>
    </div>
    <div className="card-body">
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-md-3">
          <div className="p-3 border rounded text-center">
            <div className="text-muted small mb-1">Average Grade</div>
            <h2 className="fw-bold text-success mb-0">{stats.averageGrade.toFixed(2)}</h2>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="p-3 border rounded text-center">
            <div className="text-muted small mb-1">Passed Exams</div>
            <h2 className="fw-bold text-primary mb-0">{stats.passedExams}</h2>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="p-3 border rounded text-center">
            <div className="text-muted small mb-1">Non-passed Exams</div>
            <h2 className="fw-bold text-danger mb-0">{stats.nonPassedExams}</h2>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="p-3 border rounded text-center">
            <div className="text-muted small mb-1">Earned ECTS</div>
            <h2 className="fw-bold text-info mb-0">{stats.earnedEcts}</h2>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default StudyStatsCard;
