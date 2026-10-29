import React, { useState } from "react";
import type { CreateSubject } from "../../../../features/subjects/models/subject";
import type { User } from "../../../../shared/models/User";
import { USER_ROLES } from "../../../../shared/constants/constants";
import {
  subjectCreateSchema,
  type SubjectCreateFieldErrors,
} from "../../utils/subjectSchemas";
import type {
  CreateSubjectResult,
  CreateSubjectFieldErrors,
} from "../../../subjects/api/subjectService";

interface SubjectCreateFormProps {
  professors: User[];
  onSave: (newSubject: CreateSubject) => Promise<CreateSubjectResult>;
  onCancel: () => void;
}

const SUBJECT_CODE_HELP =
  "Subjects sharing a code are the same course taught by different professors.";

const SubjectCreateForm: React.FC<SubjectCreateFormProps> = ({
  professors,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateSubject>({
    SubjectName: "",
    SubjectCode: "",
    ECTS: 6,
    ProfessorId: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof CreateSubject, boolean>>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<CreateSubjectFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsed = subjectCreateSchema.safeParse(formData);
  const fieldErrors: SubjectCreateFieldErrors = parsed.success
    ? {}
    : (parsed.error.flatten().fieldErrors as SubjectCreateFieldErrors);

  // Zod (client) wins when present; otherwise fall back to a server-side message.
  const errorFor = (field: keyof CreateSubject): string | undefined =>
    fieldErrors[field]?.[0] ?? serverFieldErrors[field];

  const showError = (field: keyof CreateSubject): string | undefined =>
    touched[field] ? errorFor(field) : undefined;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // A field being edited should drop its stale server error.
    setServerFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormData((prev) => ({
      ...prev,
      // ECTS is numeric; an empty field becomes NaN so Zod reports it as required.
      // ProfessorId is a GUID string and must not be coerced.
      [name]: name === "ECTS" ? (value === "" ? NaN : Number(value)) : value,
    }));
  };

  const handleBlur = (field: keyof CreateSubject) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ SubjectName: true, SubjectCode: true, ECTS: true, ProfessorId: true });
    setServerError(null);
    if (!parsed.success) return;

    setIsSubmitting(true);
    const result = await onSave(formData);
    if (result && !result.ok) {
      if (result.fieldErrors) setServerFieldErrors(result.fieldErrors);
      if (result.message) setServerError(result.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="card my-4">
      <div className="card-header">
        <h5>Create New Subject</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="alert alert-danger">{serverError}</div>
          )}

          <div className="mb-3">
            <label htmlFor="subjectName" className="form-label">
              Subject Name
            </label>
            <input
              type="text"
              className={`form-control${showError("SubjectName") ? " is-invalid" : ""}`}
              id="subjectName"
              name="SubjectName"
              value={formData.SubjectName}
              onChange={handleChange}
              onBlur={() => handleBlur("SubjectName")}
            />
            {showError("SubjectName") && (
              <div className="invalid-feedback">{showError("SubjectName")}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="subjectCode" className="form-label">
              Subject Code
            </label>
            <input
              type="text"
              className={`form-control${showError("SubjectCode") ? " is-invalid" : ""}`}
              id="subjectCode"
              name="SubjectCode"
              value={formData.SubjectCode}
              onChange={handleChange}
              onBlur={() => handleBlur("SubjectCode")}
              aria-describedby="subjectCodeHelp"
            />
            {showError("SubjectCode") && (
              <div className="invalid-feedback">{showError("SubjectCode")}</div>
            )}
            <div id="subjectCodeHelp" className="form-text">
              {SUBJECT_CODE_HELP}
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="ects" className="form-label">
              ECTS
            </label>
            <input
              type="number"
              className={`form-control${showError("ECTS") ? " is-invalid" : ""}`}
              id="ects"
              name="ECTS"
              value={Number.isNaN(formData.ECTS) ? "" : formData.ECTS}
              onChange={handleChange}
              onBlur={() => handleBlur("ECTS")}
            />
            {showError("ECTS") && (
              <div className="invalid-feedback">{showError("ECTS")}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="professor" className="form-label">
              Professor
            </label>
            <select
              className={`form-select${showError("ProfessorId") ? " is-invalid" : ""}`}
              id="professor"
              name="ProfessorId"
              value={formData.ProfessorId}
              onChange={handleChange}
              onBlur={() => handleBlur("ProfessorId")}
            >
              <option value="">Select professor</option>
              {professors
                .filter((p) => p.userRole === USER_ROLES.Professor && !p.isDeleted)
                .map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.firstName} {prof.lastName}
                  </option>
                ))}
            </select>
            {showError("ProfessorId") && (
              <div className="invalid-feedback">{showError("ProfessorId")}</div>
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

export default SubjectCreateForm;
