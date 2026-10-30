import React, { useState, useEffect } from "react";
import type {
  CreateEnrollment,
  Enrollment,
} from "../../../../features/subjects/models/enrollment";
import type { User } from "../../../../shared/models/User";
import type { Subject } from "../../../../features/subjects/models/subject";
import {
  enrollmentCreateSchema,
  type EnrollmentCreateFieldErrors,
} from "../../utils/enrollmentSchemas";
import type { CreateEnrollmentResult } from "../../../subjects/api/enrollmentService";

interface EnrollmentCreateFormProps {
  students: User[];
  subjects: Subject[];
  enrollments: Enrollment[];
  onSave: (newEnrollment: CreateEnrollment) => Promise<CreateEnrollmentResult>;
  onCancel: () => void;
}

const EnrollmentCreateForm: React.FC<EnrollmentCreateFormProps> = ({
  students,
  subjects,
  enrollments,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateEnrollment>({
    StudentId: "",
    SubjectId: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof CreateEnrollment, boolean>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>(
    subjects.filter((s) => !s.isDeleted)
  );

  // Inactive students cannot be enrolled, so they are not offered.
  const availableStudents = students.filter((s) => !s.isDeleted);

  useEffect(() => {
    if (formData.StudentId) {
      const enrolledSubjectIds = enrollments
        .filter((e) => String(e.studentId) === formData.StudentId)
        .map((e) => e.subjectId);

      const filteredSubjects = subjects.filter(
        (s) => !enrolledSubjectIds.includes(s.id) && !s.isDeleted
      );
      setAvailableSubjects(filteredSubjects);
    } else {
      setAvailableSubjects(subjects.filter((s) => !s.isDeleted));
    }
  }, [formData.StudentId, subjects, enrollments]);

  const parsed = enrollmentCreateSchema.safeParse(formData);
  const fieldErrors: EnrollmentCreateFieldErrors = parsed.success
    ? {}
    : (parsed.error.flatten().fieldErrors as EnrollmentCreateFieldErrors);

  const showError = (field: keyof CreateEnrollment): string | undefined =>
    touched[field] ? fieldErrors[field]?.[0] : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    // StudentId / SubjectId are GUID strings and must not be coerced with Number().
    setServerError(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field: keyof CreateEnrollment) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ StudentId: true, SubjectId: true });
    setServerError(null);
    if (!parsed.success) return;

    setIsSubmitting(true);
    const result = await onSave(formData);
    if (result && !result.ok) {
      // Enrollment errors are not tied to one field, so show them at the top.
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
            <select
              className={`form-select${showError("StudentId") ? " is-invalid" : ""}`}
              id="student"
              name="StudentId"
              value={formData.StudentId}
              onChange={handleChange}
              onBlur={() => handleBlur("StudentId")}
            >
              <option value="">Select student</option>
              {availableStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
            {showError("StudentId") && (
              <div className="invalid-feedback">{showError("StudentId")}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="subject" className="form-label">
              Subject
            </label>
            <select
              className={`form-select${showError("SubjectId") ? " is-invalid" : ""}`}
              id="subject"
              name="SubjectId"
              value={formData.SubjectId}
              onChange={handleChange}
              onBlur={() => handleBlur("SubjectId")}
            >
              <option value="">Select subject</option>
              {availableSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
            {showError("SubjectId") && (
              <div className="invalid-feedback">{showError("SubjectId")}</div>
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
