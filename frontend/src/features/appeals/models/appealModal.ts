export interface AppealModalState {
  enrollmentId: string;
  text: string;
  isSubmitting: boolean;
  error: string | null;
}

export interface SubmitAppealDto {
  enrollmentId: string;
  text: string;
}

export interface AppealDto {
  id: string;
  gradeId: string;
  text: string;
  submittedAt: string;
  status: string;
  reviewedAt: string | null;
}
