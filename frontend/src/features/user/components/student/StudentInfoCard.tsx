import React from 'react';
import type { StudentProfile } from '../../models/studentDashboard';

interface Props {
  profile: StudentProfile;
}

const StudentInfoCard: React.FC<Props> = ({ profile }) => (
  <div className="card mb-4">
    <div className="card-header bg-primary text-white">
      <h5 className="mb-0">My Information</h5>
    </div>
    <div className="card-body">
      <p className="mb-1">
        <span className="fw-bold">Name:</span> {profile.firstName} {profile.lastName}
      </p>
      <p className="mb-1">
        <span className="fw-bold">Email:</span> {profile.email}
      </p>
      <p className="mb-0">
        <span className="fw-bold">Index number:</span>{' '}
        {profile.indexNumber ?? '—'}
      </p>
    </div>
  </div>
);

export default StudentInfoCard;
