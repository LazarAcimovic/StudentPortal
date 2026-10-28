import React, { useState } from "react";
import type { CreateSubject } from "../../../../models/SubjectModel";
import type { User } from "../../../../models/UserModel";
import { USER_ROLES } from "../../../../shared/constants/constants";
import {
  subjectCreateSchema,
  type SubjectCreateFieldErrors,
} from "../../utils/subjectSchemas";

interface SubjectCreateFormProps {
  professors: User[];
  onSave: (newSubject: CreateSubject) => void;
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
    ECTS: 0,
    ProfessorId: 0,
  });
  const [touched, setTouched] = useState<Partial<Record<keyof CreateSubject, boolean>>>({});

  const parsed = subjectCreateSchema.safeParse(formData);
  const fieldErrors: SubjectCreateFieldErrors = parsed.success
    ? {}
    : (parsed.error.flatten().fieldErrors as SubjectCreateFieldErrors);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "ECTS" || name === "ProfessorId" ? Number(value) : value,
    }));
  };

  const handleBlur = (field: keyof CreateSubject) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ SubjectName: true, SubjectCode: true, ECTS: true, ProfessorId: true });
    if (!parsed.success) return;
    onSave(formData);
  };

  return (
    <div className="card my-4">
      <div className="card-header">
        <h5>Create New Subject</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="subjectName" className="form-label">
              Subject Name
            </label>
            <input
              type="text"
              className={`form-control${touched.SubjectName && fieldErrors.SubjectName ? " is-invalid" : ""}`}
              id="subjectName"
              name="SubjectName"
              value={formData.SubjectName}
              onChange={handleChange}
              onBlur={() => handleBlur("SubjectName")}
            />
            {touched.SubjectName && fieldErrors.SubjectName && (
              <div className="invalid-feedback">{fieldErrors.SubjectName[0]}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="subjectCode" className="form-label">
              Subject Code
            </label>
            <input
              type="text"
              className={`form-control${touched.SubjectCode && fieldErrors.SubjectCode ? " is-invalid" : ""}`}
              id="subjectCode"
              name="SubjectCode"
              value={formData.SubjectCode}
              onChange={handleChange}
              onBlur={() => handleBlur("SubjectCode")}
              aria-describedby="subjectCodeHelp"
            />
            {touched.SubjectCode && fieldErrors.SubjectCode && (
              <div className="invalid-feedback">{fieldErrors.SubjectCode[0]}</div>
            )}
            <div id="subjectCodeHelp" className="form-text">
              {SUBJECT_CODE_HELP}
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="etcs" className="form-label">
              ECTS
            </label>
            <input
              type="number"
              className={`form-control${touched.ECTS && fieldErrors.ECTS ? " is-invalid" : ""}`}
              id="etcs"
              name="ECTS"
              value={formData.ECTS}
              onChange={handleChange}
              onBlur={() => handleBlur("ECTS")}
            />
            {touched.ECTS && fieldErrors.ECTS && (
              <div className="invalid-feedback">{fieldErrors.ECTS[0]}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="professor" className="form-label">
              Professor
            </label>
            <select
              className={`form-select${touched.ProfessorId && fieldErrors.ProfessorId ? " is-invalid" : ""}`}
              id="professor"
              name="ProfessorId"
              value={formData.ProfessorId}
              onChange={handleChange}
              onBlur={() => handleBlur("ProfessorId")}
            >
              <option value="">Select professor</option>
              {professors
                .filter((p) => p.userRole === USER_ROLES.Professor)
                .map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.firstName} {prof.lastName}
                  </option>
                ))}
            </select>
            {touched.ProfessorId && fieldErrors.ProfessorId && (
              <div className="invalid-feedback">{fieldErrors.ProfessorId[0]}</div>
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
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectCreateForm;
