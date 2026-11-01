import React, { useState, useCallback } from "react";
import type { CreateEnrollment } from "../../../../features/subjects/models/enrollment";
import {
  enrollmentCreateSchema,
  type EnrollmentCreateFieldErrors,
} from "../../utils/enrollmentSchemas";
import type { CreateEnrollmentResult } from "../../../subjects/api/enrollmentService";
import { searchUsers, type UserSearchResult } from "../../api/userService";
import { searchSubjects, type SubjectSearchResult } from "../../../subjects/api/subjectService";
import SearchableCombobox from "../../../../components/ui/SearchableCombobox";

interface EnrollmentCreateFormProps {
  onSave: (newEnrollment: CreateEnrollment) => Promise<CreateEnrollmentResult>;
  onCancel: () => void;
}

const EnrollmentCreateForm: React.FC<EnrollmentCreateFormProps> = ({
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateEnrollment>({
    StudentId: "",
    SubjectId: "",
  });
  const [selectedStudent, setSelectedStudent] = useState<UserSearchResult | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectSearchResult | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof CreateEnrollment, boolean>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsed = enrollmentCreateSchema.safeParse(formData);
  const fieldErrors: EnrollmentCreateFieldErrors = parsed.success
    ? {}
    : (parsed.error.flatten().fieldErrors as EnrollmentCreateFieldErrors);

  const showError = (field: keyof CreateEnrollment): string | undefined =>
    touched[field] ? fieldErrors[field]?.[0] : undefined;

  const fetchStudentsPage = useCallback(
    (query: string, page: number, signal: AbortSignal) =>
      searchUsers("Student", query, page, signal),
    []
  );

  const fetchSubjectsPage = useCallback(
    (query: string, page: number, signal: AbortSignal) =>
      searchSubjects(query, page, signal),
    []
  );

  const handleStudentChange = (item: UserSearchResult | null) => {
    setServerError(null);
    setSelectedStudent(item);
    setFormData((prev) => ({ ...prev, StudentId: item ? item.id : "" }));
    setTouched((prev) => ({ ...prev, StudentId: true }));
  };

  const handleSubjectChange = (item: SubjectSearchResult | null) => {
    setServerError(null);
    setSelectedSubject(item);
    setFormData((prev) => ({ ...prev, SubjectId: item ? item.id : "" }));
    setTouched((prev) => ({ ...prev, SubjectId: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ StudentId: true, SubjectId: true });
    setServerError(null);
    if (!parsed.success) return;

    setIsSubmitting(true);
    const result = await onSave(formData);
    if (result && !result.ok) {
      const fieldError = result.fieldErrors
        ? Object.values(result.fieldErrors).find(Boolean)
        : undefined;
      setServerError(result.message ?? fieldError ?? "Failed to create enrollment.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="card my-4">
      <div className="card-header">
        <h5>Create New Enrollment</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="alert alert-danger">{serverError}</div>
          )}

          <div className="mb-3">
            <label htmlFor="student" className="form-label">
              Student
            </label>
            <SearchableCombobox
              id="student"
              value={selectedStudent}
              onChange={handleStudentChange}
              fetchPage={fetchStudentsPage}
              getLabel={(s) =>
                s.indexNumber
                  ? `${s.firstName} ${s.lastName} (${s.indexNumber})`
                  : `${s.firstName} ${s.lastName}`
              }
              getId={(s) => s.id}
              placeholder="Search student…"
              isInvalid={!!showError("StudentId")}
            />
            {showError("StudentId") && (
              <div className="text-danger" style={{ fontSize: "0.875em", marginTop: "0.25rem" }}>
                {showError("StudentId")}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="subject" className="form-label">
              Subject
            </label>
            <SearchableCombobox
              id="subject"
              value={selectedSubject}
              onChange={handleSubjectChange}
              fetchPage={fetchSubjectsPage}
              getLabel={(s) => `${s.subjectName} (${s.subjectCode})`}
              getId={(s) => s.id}
              placeholder="Search subject…"
              isInvalid={!!showError("SubjectId")}
            />
            {showError("SubjectId") && (
              <div className="text-danger" style={{ fontSize: "0.875em", marginTop: "0.25rem" }}>
                {showError("SubjectId")}
              </div>
            )}
          </div>

          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!parsed.success || isSubmitting}
            >
              {isSubmitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollmentCreateForm;
