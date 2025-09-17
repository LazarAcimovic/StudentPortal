// src/components/admin/EnrollmentCreateForm.tsx
import React, { useState, useEffect } from "react"; // <-- Dodaj useEffect
import type {
  CreateEnrollment,
  Enrollment,
} from "../../models/EnrollmentModel"; // <-- Dodaj Enrollment tip
import type { User } from "../../models/UserModel";
import type { Subject } from "../../models/SubjectModel";

interface EnrollmentCreateFormProps {
  students: User[];
  subjects: Subject[];
  enrollments: Enrollment[]; // <-- Dodaj novi prop
  onSave: (newEnrollment: CreateEnrollment) => void;
  onCancel: () => void;
}

const EnrollmentCreateForm: React.FC<EnrollmentCreateFormProps> = ({
  students,
  subjects,
  enrollments, // <-- Prihvati prop
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateEnrollment>({
    StudentId: 0,
    SubjectId: 0,
  });

  // Dodajemo state za filtrirane predmete
  const [availableSubjects, setAvailableSubjects] =
    useState<Subject[]>(subjects);

  useEffect(() => {
    // Ova funkcija se poziva svaki put kada se promeni odabrani student
    if (formData.StudentId > 0) {
      // Filtriraj upise za trenutno odabranog studenta
      const enrolledSubjectIds = enrollments
        .filter((e) => e.studentId === formData.StudentId)
        .map((e) => e.subjectId);

      // Filtriraj sve predmete kako bi se prikazali samo oni na koje student nije upisan
      const filteredSubjects = subjects.filter(
        (s) => !enrolledSubjectIds.includes(s.id) && !s.isDeleted
      );
      setAvailableSubjects(filteredSubjects);
    } else {
      // Ako nije izabran nijedan student, prikaži sve aktivne predmete
      setAvailableSubjects(subjects.filter((s) => !s.isDeleted));
    }
  }, [formData.StudentId, subjects, enrollments]); // <-- Zavisnosti useEffect hook-a

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
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
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
              {availableSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.subjectName}
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
