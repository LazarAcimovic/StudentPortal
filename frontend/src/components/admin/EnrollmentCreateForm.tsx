import React, { useState } from "react";
import type { CreateEnrollment } from "../../models/EnrollmentModel";
import type { User } from "../../models/UserModel";
import type { Subject } from "../../models/SubjectModel";
import { RoleEnum } from "../../models/Enums";

interface EnrollmentCreateFormProps {
  students: User[];
  subjects: Subject[];
  onSave: (newEnrollment: CreateEnrollment) => void;
  onCancel: () => void;
}

const EnrollmentCreateForm: React.FC<EnrollmentCreateFormProps> = ({
  students,
  subjects,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateEnrollment>({
    StudentId: 0,
    SubjectId: 0,
    IsDeleted: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="card my-4">
      <div className="card-header">
        <h5>Kreiraj Novi Upis</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="student" className="form-label">
              Student
            </label>
            <select
              className="form-select"
              id="student"
              name="StudentId"
              value={formData.StudentId}
              onChange={handleChange}
              required
            >
              <option value="">Izaberi studenta</option>
              {students
                .filter((s) => s.UserRole === RoleEnum.Student)
                .map((student) => (
                  <option key={student.Id} value={student.Id}>
                    {student.FirstName} {student.LastName}
                  </option>
                ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="subject" className="form-label">
              Predmet
            </label>
            <select
              className="form-select"
              id="subject"
              name="SubjectId"
              value={formData.SubjectId}
              onChange={handleChange}
              required
            >
              <option value="">Izaberi predmet</option>
              {subjects
                .filter((s) => !s.IsDeleted) // Prikazujemo samo aktivne predmete
                .map((subject) => (
                  <option key={subject.Id} value={subject.Id}>
                    {subject.SubjectName}
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

export default EnrollmentCreateForm;
