import React, { useState, useEffect } from "react";
import type {
  CreateEnrollment,
  Enrollment,
} from "../../models/EnrollmentModel";
import type { User } from "../../models/UserModel";
import type { Subject } from "../../models/SubjectModel";

interface EnrollmentCreateFormProps {
  students: User[];
  subjects: Subject[];
  enrollments: Enrollment[];
  onSave: (newEnrollment: CreateEnrollment) => void;
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
    StudentId: 0,
    SubjectId: 0,
  });

  // Dodajemo state za filtrirane predmete
  const [availableSubjects, setAvailableSubjects] =
    useState<Subject[]>(subjects);

  useEffect(() => {
    if (formData.StudentId > 0) {
      const enrolledSubjectIds = enrollments
        .filter((e) => e.studentId === formData.StudentId)
        .map((e) => e.subjectId);

      const filteredSubjects = subjects.filter(
        (s) => !enrolledSubjectIds.includes(s.id) && !s.isDeleted
      );
      setAvailableSubjects(filteredSubjects);
    } else {
      setAvailableSubjects(subjects.filter((s) => !s.isDeleted));
    }
  }, [formData.StudentId, subjects, enrollments]);

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
        <h5>Create New Enrollment</h5>
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
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="subject" className="form-label">
              Subject
            </label>
            <select
              className="form-select"
              id="subject"
              name="SubjectId"
              value={formData.SubjectId}
              onChange={handleChange}
              required
            >
              <option value="">Select subject</option>
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

export default EnrollmentCreateForm;
