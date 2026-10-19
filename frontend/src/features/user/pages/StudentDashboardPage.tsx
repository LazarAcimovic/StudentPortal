import React, { useState } from 'react';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import {
  APPEAL_MODAL_INITIAL_STATE,
  APPEAL_TEXT_REQUIRED_ERROR,
  APPEAL_SUBMIT_ERROR,
  CONFIRM_GRADE_MODAL_INITIAL_STATE,
} from '../constants/student/constants';
import type { AppealModalState } from '../../appeals/models/appealModal';
import type { ConfirmGradeModalState } from '../../grades/models/confirmGradeModal';
import { toast } from 'react-toastify';
import { submitAppeal } from '../../appeals/api/appealService';
import { studentConfirmGrade } from '../../grades/api/gradeService';
import StudentInfoCard from '../components/student/StudentInfoCard';
import StudyStatsCard from '../components/student/StudyStatsCard';
import SubjectsCard from '../components/student/SubjectsCard';
import AppealModal from '../components/student/AppealModal';
import ConfirmGradeModal from '../components/student/ConfirmGradeModal';

const StudentDashboardPage: React.FC = () => {
  const { data, isLoading, error, refresh } = useStudentDashboard();
  const [appealModal, setAppealModal] = useState<AppealModalState | null>(APPEAL_MODAL_INITIAL_STATE);
  const [confirmGradeModal, setConfirmGradeModal] = useState<ConfirmGradeModalState | null>(CONFIRM_GRADE_MODAL_INITIAL_STATE);

  const openAppealModal = (enrollmentId: string) => {
    setAppealModal({ enrollmentId, text: '', isSubmitting: false, error: null });
  };

  const closeAppealModal = () => {
    if (appealModal?.isSubmitting) return;
    setAppealModal(APPEAL_MODAL_INITIAL_STATE);
  };

  const openConfirmGradeModal = (enrollmentId: string) => {
    setConfirmGradeModal({ enrollmentId, isSubmitting: false });
  };

  const closeConfirmGradeModal = () => {
    if (confirmGradeModal?.isSubmitting) return;
    setConfirmGradeModal(CONFIRM_GRADE_MODAL_INITIAL_STATE);
  };

  const handleConfirmGrade = async () => {
    if (!confirmGradeModal || confirmGradeModal.isSubmitting) return;
    setConfirmGradeModal({ ...confirmGradeModal, isSubmitting: true });
    try {
      await studentConfirmGrade({ enrollmentId: confirmGradeModal.enrollmentId });
      setConfirmGradeModal(CONFIRM_GRADE_MODAL_INITIAL_STATE);
      toast.success("Grade confirmed.");
      refresh();
    } finally {
      setConfirmGradeModal(prev => (prev ? { ...prev, isSubmitting: false } : null));
    }
  };

  const handleAppealTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!appealModal) return;
    setAppealModal({ ...appealModal, text: e.target.value });
  };

  const handleAppealSubmit = async () => {
    if (!appealModal || appealModal.isSubmitting) return;

    const text = appealModal.text.trim();
    if (!text) {
      setAppealModal({ ...appealModal, error: APPEAL_TEXT_REQUIRED_ERROR });
      return;
    }

    setAppealModal({ ...appealModal, isSubmitting: true, error: null });

    try {
      await submitAppeal({ enrollmentId: appealModal.enrollmentId, text });
      setAppealModal(APPEAL_MODAL_INITIAL_STATE);
      toast.success("Appeal submitted successfully.");
      refresh();
    } catch {
      toast.error("Failed to submit appeal. Please try again.");
      setAppealModal(prev =>
        prev ? { ...prev, isSubmitting: false, error: APPEAL_SUBMIT_ERROR } : null
      );
    }
  };

  if (isLoading) {
    return (
      <main className="container my-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container my-4">
        <div className="alert alert-danger">{error}</div>
      </main>
    );
  }

  if (!data) return null;

  const { profile, stats, subjects } = data;

  return (
    <main className="container my-4">
      <h1 className="mb-2">Student Dashboard</h1>
      <p className="mb-4">
        Hello, {profile.firstName} {profile.lastName}!
      </p>

      <StudentInfoCard profile={profile} />
      <StudyStatsCard stats={stats} />
      <SubjectsCard
        subjects={subjects}
        onWriteAppeal={openAppealModal}
        onConfirmGrade={openConfirmGradeModal}
        confirmingEnrollmentId={confirmGradeModal?.isSubmitting ? confirmGradeModal.enrollmentId : null}
      />

      <ConfirmGradeModal
        modalState={confirmGradeModal}
        onClose={closeConfirmGradeModal}
        onConfirm={handleConfirmGrade}
      />
      <AppealModal
        modalState={appealModal}
        onClose={closeAppealModal}
        onTextChange={handleAppealTextChange}
        onSubmit={handleAppealSubmit}
      />
    </main>
  );
};

export default StudentDashboardPage;
