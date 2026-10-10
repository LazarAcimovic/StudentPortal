import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { RoleEnum } from "../../models/Enums";
import type { User } from "../../models/UserModel";
import type { Subject } from "../../models/SubjectModel";
import type { Grade, CreateGrade, UpdateGrade } from "../../models/GradeModel";
//import { MOCK_ENROLLMENTS } from "../../services/data/enrollmentsMock";
import {
  getProfessorSubjects,
  getStudentsBySubject, // Dodata nova funkcija
} from "../../services/api/studentService";
import {
  confirmGrade,
  createGrade,
  deleteGrade,
  getGradesByStudentAndSubject,
  updateGrade,
} from "../../services/api/gradeService";

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
    const fetchProfessorData = async () => {
      if (user?.userRole === RoleEnum.Professor) {
        try {
          console.log(user.id);
          const professorSubjects = await getProfessorSubjects(user.id);
          setSubjects(professorSubjects);
        } catch (error) {
          console.error("Failed to fetch professor's subjects:", error);
          setError("Failed to fetch subjects.");
        }
      }
    };
    fetchProfessorData();
  }, [user]);

  const fetchGrades = async () => {
    if (selectedSubject && selectedStudent) {
      try {
        const studentGrades = await getGradesByStudentAndSubject(
          selectedStudent.id,
          selectedSubject.id
        );
        console.log(studentGrades);
        setGrades(studentGrades);
      } catch (err) {
        setError("Failed to fetch grades.");
        console.log(err);
        setGrades([]);
      }
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [selectedSubject, selectedStudent]);

  const handleSubjectClick = async (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedStudent(null);
    setGrades([]);
    setNewGradeValue("");
    setNewComment("");
    setEditingGrade(null);
    setError(null);
    if (user) {
      try {
        const studentsList = await getStudentsBySubject(subject.id);
        setStudents(studentsList);
      } catch (error) {
        console.error("Failed to fetch students for subject:", error);
        setError("Failed to fetch students for this subject.");
      }
    }
  };

  const handleStudentClick = (student: User) => {
    setSelectedStudent(student);
    setNewGradeValue("");
    setNewComment("");
    setEditingGrade(null);
    setError(null);
  };

  const handleAddGrade = async () => {
    if (!selectedStudent || !selectedSubject) {
      setError("Please select a student and a subject.");
      return;
    }
    const gradeValue = parseInt(newGradeValue);
    if (isNaN(gradeValue) || gradeValue < 5 || gradeValue > 10) {
      setError("Grade must be a number between 5 and 10.");
      return;
    }

    const enrollmentId = grades.length > 0 ? grades[0].enrollmentId : null;

    if (!enrollmentId) {
      setError(
        "Enrollment ID not found for this student and subject."
      );
      return;
    }

    const newGrade: CreateGrade = {
      EnrollmentId: enrollmentId,
      StudentGrade: gradeValue,
      Comment: newComment,
    };

    const result = await createGrade(newGrade);

    if (result instanceof Error) {
      setError(result.message);
    } else {
      await fetchGrades();
      setNewGradeValue("");
      setNewComment("");
      setError(null);
    }
  };

  const handleUpdateGrade = async () => {
    if (!editingGrade || !selectedStudent || !selectedSubject) return;

    if (editingGrade.isConfirmed) {
      setError("You cannot edit a confirmed grade.");
      return;
    }

    const gradeValue = parseInt(newGradeValue);
    if (isNaN(gradeValue) || gradeValue < 5 || gradeValue > 10) {
      setError("Grade must be a number between 5 and 10.");
      return;
    }

    const updatedData: UpdateGrade = {
      EnrollmentId: editingGrade.enrollmentId,
      StudentGrade: gradeValue,
      Comment: newComment,
    };

    const result = await updateGrade(editingGrade.id, updatedData);

    if (result instanceof Error) {
      setError(result.message);
    } else {
      await fetchGrades(); //ovo obavezno
      setEditingGrade(null);
      setNewGradeValue("");
      setNewComment("");
      setError(null);
    }
  };

  const handleDeleteGrade = async (gradeId: number) => {
    const result = await deleteGrade(gradeId);
    if (result instanceof Error) {
      setError(result.message);
    } else if (result) {
      setGrades((prevGrades) => prevGrades.filter((g) => g.id !== gradeId));
    } else {
      setError("Cannot delete a confirmed grade.");
    }
  };

  const handleConfirmGrade = async (gradeId: number) => {
    const result = await confirmGrade(gradeId);
    if (result instanceof Error) {
      setError(result.message);
    } else {
      setGrades((prevGrades) =>
        prevGrades.map((g) => (g.id === gradeId ? result : g))
      );
    }
  };

  if (!user || user.userRole !== RoleEnum.Professor) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger text-center">
          <h3>Access denied</h3>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Professor Dashboard</h2>
      <div className="row">
        {/* Lista predmeta */}
        <div className="col-md-3">
          <h4 className="mb-3">My Subjects</h4>
          <ul className="list-group">
            {subjects.map((subject) => (
              <li
                key={subject.id}
                className={`list-group-item list-group-item-action ${
                  selectedSubject?.id === subject.id ? "active" : ""
                }`}
                onClick={() => handleSubjectClick(subject)}
                style={{ cursor: "pointer" }}
              >
                {subject.subjectName}
              </li>
            ))}
          </ul>
        </div>
        {/* Lista studenata */}
        <div className="col-md-4">
          {selectedSubject && (
            <React.Fragment key={selectedSubject.id}>
              <h4 className="mb-3">
                Students in {selectedSubject.subjectName}
              </h4>
              <ul className="list-group">
                {students.length > 0 ? (
                  students.map((student) => (
                    <li
                      key={student.id}
                      className={`list-group-item list-group-item-action ${
                        selectedStudent?.id === student.id ? "active" : ""
                      }`}
                      onClick={() => handleStudentClick(student)}
                      style={{ cursor: "pointer" }}
                    >
                      {student.firstName} {student.lastName}
                    </li>
                  ))
                ) : (
                  <li className="list-group-item">
                    No students enrolled in this subject.
                  </li>
                )}
              </ul>
            </React.Fragment>
          )}
        </div>
        {/* Detalji studenta, ocene i unos ocena */}
        <div className="col-md-5">
          {selectedStudent && selectedSubject && (
            <React.Fragment key={selectedStudent.id}>
              <h4 className="mb-3">
                Grades for {selectedStudent.firstName} {selectedStudent.lastName}
              </h4>
              {error && <div className="alert alert-danger">{error}</div>}
              {/* Forma za dodavanje/izmenu ocene */}
              <div className="card mb-3">
                <div className="card-body">
                  <h5 className="card-title">
                    {editingGrade ? "Edit Grade" : "Add New Grade"}
                  </h5>
                  <div className="mb-3">
                    <label className="form-label">Grade</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newGradeValue}
                      onChange={(e) => setNewGradeValue(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Comment</label>
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
                      Update
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary me-2"
                      onClick={handleAddGrade}
                    >
                      Add
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
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              {/* Prikaz postojećih ocena u tabeli */}
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>Preliminary Grade</th>
                    <th>Final Grade</th>
                    <th>Comment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.length > 0 ? (
                    grades.map((grade) => (
                      <tr key={grade.id}>
                        <td>
                          {grade.isConfirmed ? "-" : grade.studentGrade}
                          {!grade.isConfirmed && grade.studentGrade === 5 && (
                            <span className="badge bg-danger ms-2">
                              Failed
                            </span>
                          )}
                        </td>
                        <td>
                          {grade.isConfirmed ? grade.studentGrade : "-"}
                          {grade.isConfirmed && grade.studentGrade === 5 && (
                            <span className="badge bg-danger ms-2">
                              Failed
                            </span>
                          )}
                        </td>
                        <td>{grade.comment}</td>
                        <td>
                          {!grade.isConfirmed ? (
                            <>
                              <button
                                className="btn btn-sm btn-success me-2"
                                onClick={() => handleConfirmGrade(grade.id)}
                              >
                                Confirm
                              </button>
                              <button
                                className="btn btn-sm btn-warning me-2"
                                onClick={() => {
                                  setEditingGrade(grade);
                                  setNewGradeValue(
                                    grade.studentGrade.toString()
                                  );
                                  setNewComment(grade.comment || "");
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteGrade(grade.id)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-muted">Confirmed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>No grades for this student.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboardPage;
