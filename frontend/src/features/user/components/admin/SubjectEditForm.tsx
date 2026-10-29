import React, { useState } from "react";
import type { Subject, UpdateSubject } from "../../../../features/subjects/models/subject";
import type { User } from "../../../../shared/models/User";
import { USER_ROLES } from "../../../../shared/constants/constants";
import {
  subjectEditSchema,
  type SubjectEditFieldErrors,
} from "../../utils/subjectSchemas";

interface SubjectEditFormProps {
  subject: Subject;
  professors: User[];
  onSave: (updatedSubject: UpdateSubject) => void;
  onCancel: () => void;
}

const SUBJECT_CODE_HELP =
  "Subjects sharing a code are the same course taught by different professors.";

const SubjectEditForm: React.FC<SubjectEditFormProps> = ({
  subject,
  professors,
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
  const [touched, setTouched] = useState<Partial<Record<keyof UpdateSubject, boolean>>>({});

  const parsed = subjectEditSchema.safeParse(formData);
  const fieldErrors: SubjectEditFieldErrors = parsed.success
    ? {}
    : (parsed.error.flatten().fieldErrors as SubjectEditFieldErrors);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (name === "ECTS") {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (field: keyof UpdateSubject) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      SubjectName: true,
      SubjectCode: true,
      ECTS: true,
      ProfessorId: true,
      IsDeleted: true,
    });
    if (!parsed.success) return;
    onSave(formData);
  };

  return (
    <div className="card my-4">
      <div className="card-header">
        <h5>Edit Subject</h5>
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
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectEditForm;
