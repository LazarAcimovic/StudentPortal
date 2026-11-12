import React, { useState, useCallback } from "react";
import type { CreateSubject } from "../../../../features/subjects/models/subject";
import {
  subjectCreateSchema,
  type SubjectCreateFieldErrors,
} from "../../utils/subjectSchemas";
import type {
  CreateSubjectResult,
  CreateSubjectFieldErrors,
} from "../../../subjects/api/subjectService";
import { searchUsers, type UserSearchResult } from "../../api/userService";
import SearchableCombobox from "../../../../components/ui/SearchableCombobox";
import FormField from "../../../../components/ui/FormField";
import FormAlert from "../../../../components/ui/FormAlert";

interface SubjectCreateFormProps {
  onSave: (newSubject: CreateSubject) => Promise<CreateSubjectResult>;
  onCancel: () => void;
}

const SUBJECT_CODE_HELP =
  "Subjects sharing a code are the same course taught by different professors.";

const SubjectCreateForm: React.FC<SubjectCreateFormProps> = ({
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateSubject>({
    SubjectName: "",
    SubjectCode: "",
    ECTS: 6,
    ProfessorId: "",
  });
  const [selectedProfessor, setSelectedProfessor] = useState<UserSearchResult | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof CreateSubject, boolean>>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<CreateSubjectFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsed = subjectCreateSchema.safeParse(formData);
  const fieldErrors: SubjectCreateFieldErrors = parsed.success
    ? {}
    : (parsed.error.flatten().fieldErrors as SubjectCreateFieldErrors);

  const errorFor = (field: keyof CreateSubject): string | undefined =>
    fieldErrors[field]?.[0] ?? serverFieldErrors[field];

  const showError = (field: keyof CreateSubject): string | undefined =>
    touched[field] ? errorFor(field) : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setServerFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormData((prev) => ({
      ...prev,
      [name]: name === "ECTS" ? (value === "" ? NaN : Number(value)) : value,
    }));
  };

  const handleBlur = (field: keyof CreateSubject) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const fetchProfessorsPage = useCallback(
    (query: string, page: number, signal: AbortSignal) =>
      searchUsers("Professor", query, page, signal),
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
          <FormAlert message={serverError} />

          <FormField id="subjectName" label="Subject Name" error={showError("SubjectName")}>
            <input
              type="text"
              className={`form-control${showError("SubjectName") ? " is-invalid" : ""}`}
              id="subjectName"
              name="SubjectName"
              value={formData.SubjectName}
              onChange={handleChange}
              onBlur={() => handleBlur("SubjectName")}
            />
          </FormField>

          <FormField
            id="subjectCode"
            label="Subject Code"
            error={showError("SubjectCode")}
            helpText={SUBJECT_CODE_HELP}
            helpTextId="subjectCodeHelp"
          >
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
          </FormField>

          <FormField id="ects" label="ECTS" error={showError("ECTS")}>
            <input
              type="number"
              className={`form-control${showError("ECTS") ? " is-invalid" : ""}`}
              id="ects"
              name="ECTS"
              value={Number.isNaN(formData.ECTS) ? "" : formData.ECTS}
              onChange={handleChange}
              onBlur={() => handleBlur("ECTS")}
            />
          </FormField>

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
