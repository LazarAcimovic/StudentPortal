import React from 'react';
import { USER_ROLES, ROLE_LABELS } from '../../../../shared/constants/constants';
import { formatDate } from '../../utils/dateUtils';
import type { User } from '../../../../models/UserModel';

interface ProfileInfoCardProps {
  user: User;
}

const ProfileInfoCard: React.FC<ProfileInfoCardProps> = ({ user }) => (
  <div className="card mb-4">
    <div className="card-header fw-semibold">Your Info</div>
    <ul className="list-group list-group-flush">
      <li className="list-group-item d-flex justify-content-between">
        <span className="text-muted">First Name</span>
        <span>{user.firstName}</span>
      </li>
      <li className="list-group-item d-flex justify-content-between">
        <span className="text-muted">Last Name</span>
        <span>{user.lastName}</span>
      </li>
      <li className="list-group-item d-flex justify-content-between">
        <span className="text-muted">Email</span>
        <span>{user.email}</span>
      </li>
      {user.userRole === USER_ROLES.Student && (
        <li className="list-group-item d-flex justify-content-between">
          <span className="text-muted">Index Number</span>
          <span>{user.indexNumber ?? '—'}</span>
        </li>
      )}
      <li className="list-group-item d-flex justify-content-between">
        <span className="text-muted">Role</span>
        <span>{ROLE_LABELS[user.userRole] ?? '—'}</span>
      </li>
      <li className="list-group-item d-flex justify-content-between">
        <span className="text-muted">Member since</span>
        <span>{formatDate(user.createdAt)}</span>
      </li>
    </ul>
  </div>
);

export default ProfileInfoCard;
