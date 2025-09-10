import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { RoleEnum } from "../../models/Enums";
import type { User } from "../../models/UserModel";
import type { Subject } from "../../models/SubjectModel";
import type { Grade, CreateGrade, UpdateGrade } from "../../models/GradeModel";
import { MOCK_ENROLLMENTS } from "../../services/data/enrollmentsMock";
import {
  getProfessorSubjects,
  getStudents,
  getGradesByStudentAndSubject,
  createGrade,
  updateGrade,
  deleteGrade,
  confirmGrade, // Dodata nova funkcija
} from "../../services/api/studentService";

const ProfessorDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [newGradeValue, setNewGradeValue] = useState<string>("");
  const [newComment, setNewComment] = useState<string>("");
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.UserRole === RoleEnum.Professor) {
      const professorSubjects = getProfessorSubjects(user.Id);
      setSubjects(professorSubjects);
    }
  }, [user]);

  useEffect(() => {
    if (selectedSubject && selectedStudent) {
      const studentGrades = getGradesByStudentAndSubject(
        selectedStudent.Id,
        selectedSubject.Id
      );
      setGrades(studentGrades);
    }
  }, [selectedSubject, selectedStudent]);

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedStudent(null);
    setGrades([]);
    setNewGradeValue("");
    setNewComment("");
    setEditingGrade(null);
    setError(null);
    if (user) {
      const studentsList = getStudents(user.UserRole, subject.Id);
      setStudents(studentsList);
    }
  };

  const handleStudentClick = (student: User) => {
    setSelectedStudent(student);
    setNewGradeValue("");
    setNewComment("");
    setEditingGrade(null);
    setError(null);
  };

  const handleAddGrade = () => {
    if (!selectedStudent || !selectedSubject) {
      setError("Morate odabrati studenta i predmet.");
      return;
    }
    const gradeValue = parseInt(newGradeValue);
    if (isNaN(gradeValue) || gradeValue < 5 || gradeValue > 10) {
      setError("Ocena mora biti broj između 5 i 10.");
      return;
    }

    const enrollment = MOCK_ENROLLMENTS.find(
      (e) =>
        e.StudentId === selectedStudent.Id && e.SubjectId === selectedSubject.Id
    );
    if (!enrollment) {
      setError("Student nije upisan na ovaj predmet.");
      return;
    }

    const newGrade: CreateGrade = {
      EnrollmentId: enrollment.Id,
      Grade: gradeValue,
      Comment: newComment,
    };

    const result = createGrade(newGrade);

    if (result instanceof Error) {
      setError(result.message);
    } else {
      setGrades((prevGrades) => [...prevGrades, result]);
      setNewGradeValue("");
      setNewComment("");
      setError(null);
    }
  };

  const handleUpdateGrade = () => {
    if (!editingGrade || !selectedStudent || !selectedSubject) return;

    if (editingGrade.IsConfirmed) {
      setError("Ne možete izmeniti potvrđenu ocenu.");
      return;
    }

    const gradeValue = parseInt(newGradeValue);
    if (isNaN(gradeValue) || gradeValue < 5 || gradeValue > 10) {
      setError("Ocena mora biti broj između 5 i 10.");
      return;
    }

    const enrollment = MOCK_ENROLLMENTS.find(
      (e) =>
        e.StudentId === selectedStudent.Id && e.SubjectId === selectedSubject.Id
    );
    if (!enrollment) {
      setError("Student nije upisan na ovaj predmet.");
      return;
    }

    const updatedData: UpdateGrade = {
      EnrollmentId: enrollment.Id,
      StudentGrade: gradeValue,
      Comment: newComment,
    };

    const result = updateGrade(editingGrade.Id, updatedData);

    if (result instanceof Error) {
      setError(result.message);
    } else {
      setGrades((prevGrades) =>
        prevGrades.map((g) => (g.Id === editingGrade.Id ? result : g))
      );
      setEditingGrade(null);
      setNewGradeValue("");
      setNewComment("");
      setError(null);
    }
  };

  const handleDeleteGrade = (gradeId: number) => {
    const success = deleteGrade(gradeId);
    if (success) {
      setGrades((prevGrades) => prevGrades.filter((g) => g.Id !== gradeId));
    } else {
      setError("Nije moguće obrisati potvrđenu ocenu.");
    }
  };

  const handleConfirmGrade = (gradeId: number) => {
    const result = confirmGrade(gradeId);
    if (result instanceof Error) {
      setError(result.message);
    } else {
      setGrades((prevGrades) =>
        prevGrades.map((g) => (g.Id === gradeId ? result : g))
      );
    }
  };

  if (!user || user.UserRole !== RoleEnum.Professor) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger text-center">
          <h3>Pristup zabranjen</h3>
          <p>Nemate dozvolu za pristup ovoj stranici.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Profesorov Dashboard</h2>
      <div className="row">
        {/* Lista predmeta */}
        <div className="col-md-3">
          <h4 className="mb-3">Moji predmeti</h4>
          <ul className="list-group">
            {subjects.map((subject) => (
              <li
                key={subject.Id}
                className={`list-group-item list-group-item-action ${
                  selectedSubject?.Id === subject.Id ? "active" : ""
                }`}
                onClick={() => handleSubjectClick(subject)}
                style={{ cursor: "pointer" }}
              >
                {subject.SubjectName}
              </li>
            ))}
          </ul>
        </div>
        {/* Lista studenata */}
        <div className="col-md-4">
          {selectedSubject && (
            <>
              <h4 className="mb-3">
                Studenti na {selectedSubject.SubjectName}
              </h4>
              <ul className="list-group">
                {students.length > 0 ? (
                  students.map((student) => (
                    <li
                      key={student.Id}
                      className={`list-group-item list-group-item-action ${
                        selectedStudent?.Id === student.Id ? "active" : ""
                      }`}
                      onClick={() => handleStudentClick(student)}
                      style={{ cursor: "pointer" }}
                    >
                      {student.FirstName} {student.LastName}
                    </li>
                  ))
                ) : (
                  <li className="list-group-item">
                    Nema upisanih studenata na ovom predmetu.
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
        {/* Detalji studenta, ocene i unos ocena */}
        <div className="col-md-5">
          {selectedStudent && selectedSubject && (
            <>
              <h4 className="mb-3">
                Ocene za {selectedStudent.FirstName} {selectedStudent.LastName}
              </h4>
              {error && <div className="alert alert-danger">{error}</div>}
              {/* Forma za dodavanje/izmenu ocene */}
              <div className="card mb-3">
                <div className="card-body">
                  <h5 className="card-title">
                    {editingGrade ? "Izmeni ocenu" : "Dodaj novu ocenu"}
                  </h5>
                  <div className="mb-3">
                    <label className="form-label">Ocena</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newGradeValue}
                      onChange={(e) => setNewGradeValue(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Komentar</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    ></textarea>
                  </div>
                  {editingGrade ? (
                    <button
                      className="btn btn-warning me-2"
                      onClick={handleUpdateGrade}
                    >
                      Izmeni
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary me-2"
                      onClick={handleAddGrade}
                    >
                      Dodaj
                    </button>
                  )}
                  {editingGrade && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingGrade(null);
                        setNewGradeValue("");
                        setNewComment("");
                        setError(null);
                      }}
                    >
                      Poništi
                    </button>
                  )}
                </div>
              </div>
              {/* Prikaz postojećih ocena u tabeli */}
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>Preliminarna ocena</th>
                    <th>Konačna ocena</th>
                    <th>Komentar</th>
                    <th>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.length > 0 ? (
                    grades.map((grade) => (
                      <tr key={grade.Id}>
                        <td>
                          {grade.IsConfirmed ? "-" : grade.StudentGrade}
                          {!grade.IsConfirmed && grade.StudentGrade === 5 && (
                            <span className="badge bg-danger ms-2">
                              Nepoloženo
                            </span>
                          )}
                        </td>
                        <td>
                          {grade.IsConfirmed ? grade.StudentGrade : "-"}
                          {grade.IsConfirmed && grade.StudentGrade === 5 && (
                            <span className="badge bg-danger ms-2">
                              Nepoloženo
                            </span>
                          )}
                        </td>
                        <td>{grade.Comment}</td>
                        <td>
                          {!grade.IsConfirmed ? (
                            <>
                              <button
                                className="btn btn-sm btn-success me-2"
                                onClick={() => handleConfirmGrade(grade.Id)}
                              >
                                Potvrdi
                              </button>
                              <button
                                className="btn btn-sm btn-warning me-2"
                                onClick={() => {
                                  setEditingGrade(grade);
                                  setNewGradeValue(
                                    grade.StudentGrade.toString()
                                  );
                                  setNewComment(grade.Comment || "");
                                }}
                              >
                                Izmeni
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteGrade(grade.Id)}
                              >
                                Obriši
                              </button>
                            </>
                          ) : (
                            <span className="text-muted">Potvrđeno</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>Nema ocena za ovog studenta.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboardPage;
