import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMe } from '../api/profileService';
import { useUserStore } from '../../../store/user/useUserStore';
import Modal from '../../../components/ui/Modal';
import UserEditForm from '../../../components/ui/UserEditForm';
import ProfileInfoCard from '../components/profile/ProfileInfoCard';
import { APP_ROUTES } from '../../../config/constants';
import { AXIOS_CANCELED_ERROR_CODE } from '../../../shared/constants/constants';
import type { User } from '../../../shared/models/User';

const MyProfilePage: React.FC = () => {
  const { currentUser, setCurrentUser } = useUserStore();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getMe(controller.signal)
      .then((data) => {
        setProfileUser({ ...data, isDeleted: false } as User);
      })
      .catch((err: { code?: string; message?: string }) => {
        if (err?.code === AXIOS_CANCELED_ERROR_CODE) return;
        setError('Failed to load profile. Please try again.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const handleSaved = async () => {
    setEditOpen(false);
    try {
      const fresh = await getMe();
      const adapted = { ...fresh, isDeleted: false } as User;
      setProfileUser(adapted);
      setCurrentUser({
        id: fresh.id,
        firstName: fresh.firstName,
        lastName: fresh.lastName,
        email: fresh.email,
        indexNumber: fresh.indexNumber,
        userRole: fresh.userRole,
        createdAt: fresh.createdAt,
      });
    } catch {
      // card keeps its previous values if the refetch fails
    }
  };

  if (isLoading) {
    return (
      <div className="container mt-5 d-flex justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">{error ?? 'Profile unavailable.'}</div>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: 600 }}>
      <h1 className="mb-1">My Profile</h1>
      <p className="text-muted mb-4">
        {profileUser.firstName} {profileUser.lastName}
      </p>

      <ProfileInfoCard user={profileUser} />

      <div className="d-flex flex-column flex-sm-row gap-2">
        <button
          className="btn btn-primary"
          onClick={() => setEditOpen(true)}
        >
          Edit profile
        </button>
        <Link to={APP_ROUTES.CHANGE_PASSWORD} className="btn btn-outline-primary">
          Change password
        </Link>
      </div>

      {editOpen && currentUser && (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Profile"
          blurBackdrop
        >
          <UserEditForm
            scope="self"
            callerRole={profileUser.userRole}
            user={profileUser}
            onSaved={() => { void handleSaved(); }}
            onCancel={() => setEditOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default MyProfilePage;
