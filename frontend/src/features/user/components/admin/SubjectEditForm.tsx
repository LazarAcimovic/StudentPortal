import React, { useState, useCallback, useRef } from "react";
import type { Subject, UpdateSubject } from "../../../../features/subjects/models/subject";
import {
  subjectEditSchema,
  type SubjectEditFieldErrors,
} from "../../utils/subjectSchemas";
import type {
  UpdateSubjectResult,
  CreateSubjectFieldErrors,
} from "../../../subjects/api/subjectService";
import { searchUsers, type UserSearchResult } from "../../api/userService";
import SearchableCombobox from "../../../../components/ui/SearchableCombobox";

interface SubjectEditFormProps {
  subject: Subject;
  onSave: (updatedSubject: UpdateSubject) => Promise<UpdateSubjectResult>;
  onCancel: () => void;
}

const SUBJECT_CODE_HELP =
  "Subjects sharing a code are the same course taught by different professors.";

const SubjectEditForm: React.FC<SubjectEditFormProps> = ({
  subject,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<UpdateSubject>({
    Id: String(subject.id),
    SubjectName: subject.subjectName,
    SubjectCode: subject.subjectCode ?? "",
    ECTS: subject.ects,
    ProfessorId: String(subject.professorId),
    IsDeleted: subject.isDeleted,
  });
  // Initialise from the subject so the current professor shows even if inactive.
  const [selectedProfessor, setSelectedProfessor] = useState<UserSearchResult | null>({
    id: String(subject.professorId),
    firstName: subject.professorFirstName,
    lastName: subject.professorLastName,
  });
  const [touched, setTouched] = useState<Partial<Record<keyof UpdateSubject, boolean>>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<CreateSubjectFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsed = subjectEditSchema.safeParse(formData);
  const fieldErrors: SubjectEditFieldErrors = parsed.success
    ? {}
    : (parsed.error.flatten().fieldErrors as SubjectEditFieldErrors);

  const errorFor = (field: keyof UpdateSubject): string | undefined =>
    (fieldErrors as Record<string, string[] | undefined>)[field]?.[0] ??
    serverFieldErrors[field];

  const showError = (field: keyof UpdateSubject): string | undefined =>
    touched[field] ? errorFor(field) : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setServerFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (name === "ECTS") {
      setFormData((prev) => ({ ...prev, ECTS: value === "" ? NaN : Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (field: keyof UpdateSubject) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const initialProfessorRef = useRef<UserSearchResult>({
    id: String(subject.professorId),
    firstName: subject.professorFirstName,
    lastName: subject.professorLastName,
  });

  const fetchProfessorsPage = useCallback(
    async (query: string, page: number, signal: AbortSignal) => {
      const result = await searchUsers("Professor", query, page, signal);
      if (page === 1) {
        const seed = initialProfessorRef.current;
        if (!result.items.some(item => item.id === seed.id)) {
          return { ...result, items: [seed, ...result.items] };
        }
      }
      return result;
    },
    []
  );

  const handleProfessorChange = (item: UserSearchResult | null) => {
    setSelectedProfessor(item);
    setServerFieldErrors((prev) => ({ ...prev, ProfessorId: undefined }));
    setFormData((prev) => ({ ...prev, ProfessorId: item ? item.id : "" }));
    setTouched((prev) => ({ ...prev, ProfessorId: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      SubjectName: true,
      SubjectCode: true,
      ECTS: true,
      ProfessorId: true,
      IsDeleted: true,
    });
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
        <h5>Edit Subject</h5>
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
            <SearchableCombobox
              id="professor"
              value={selectedProfessor}
              onChange={handleProfessorChange}
              fetchPage={fetchProfessorsPage}
              getLabel={(p) => `${p.firstName} ${p.lastName}`}
              getId={(p) => p.id}
              placeholder="Search professor…"
              isInvalid={!!showError("ProfessorId")}
            />
            {showError("ProfessorId") && (
              <div className="text-danger" style={{ fontSize: "0.875em", marginTop: "0.25rem" }}>
                {showError("ProfessorId")}
              </div>
            )}
          </div>

          <div className="mb-3 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="isDeleted"
              name="IsDeleted"
              checked={formData.IsDeleted}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="isDeleted">
              Deleted
            </label>
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
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectEditForm;
