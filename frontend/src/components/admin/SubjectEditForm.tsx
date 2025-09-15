import React, { useState } from "react";
import type { Subject, UpdateSubject } from "../../models/SubjectModel";
import type { User } from "../../models/UserModel";
import { RoleEnum } from "../../models/Enums";

interface SubjectEditFormProps {
  subject: Subject;
  professors: User[];
  onSave: (updatedSubject: UpdateSubject) => void;
  onCancel: () => void;
}

const SubjectEditForm: React.FC<SubjectEditFormProps> = ({
  subject,
  professors,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<UpdateSubject>({
    Id: subject.Id,
    SubjectName: subject.SubjectName,
    Etcs: subject.Etcs,
    ProfessorId: subject.ProfessorId,
    IsDeleted: subject.IsDeleted,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (name === "ProfessorId" || name === "Etcs") {
      setFormData((prev) => ({
        ...prev,
        [name]: Number(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="card my-4">
      <div className="card-header">
        <h5>Uredi Predmet</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="subjectName" className="form-label">
              Naziv predmeta
            </label>
            <input
              type="text"
              className="form-control"
              id="subjectName"
              name="SubjectName"
              value={formData.SubjectName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="etcs" className="form-label">
              ETCS
            </label>
            <input
              type="number"
              className="form-control"
              id="etcs"
              name="Etcs"
              value={formData.Etcs}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="professor" className="form-label">
              Profesor
            </label>
            <select
              className="form-select"
              id="professor"
              name="ProfessorId"
              value={formData.ProfessorId}
              onChange={handleChange}
              required
            >
              <option value="">Izaberi profesora</option>
              {professors
                .filter((p) => p.UserRole === RoleEnum.Professor)
                .map((prof) => (
                  <option key={prof.Id} value={prof.Id}>
                    {prof.FirstName} {prof.LastName}
                  </option>
                ))}
            </select>
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
              Obrisan
            </label>
          </div>

          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={onCancel}
            >
              Otkaži
            </button>
            <button type="submit" className="btn btn-primary">
              Sačuvaj izmene
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectEditForm;
