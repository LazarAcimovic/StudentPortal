import React, { useState } from "react";
import type { CreateSubject } from "../../models/SubjectModel";
import type { User } from "../../models/UserModel";
import { RoleEnum } from "../../models/Enums";

interface SubjectCreateFormProps {
  professors: User[];
  onSave: (newSubject: CreateSubject) => void;
  onCancel: () => void;
}

const SubjectCreateForm: React.FC<SubjectCreateFormProps> = ({
  professors,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateSubject>({
    SubjectName: "",
    Etcs: 0,
    ProfessorId: 0,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "Etcs" || name === "ProfessorId" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="card my-4">
      <div className="card-header">
        <h5>Kreiraj Novi Predmet</h5>
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
          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={onCancel}
            >
              Otkaži
            </button>
            <button type="submit" className="btn btn-primary">
              Kreiraj
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectCreateForm;
