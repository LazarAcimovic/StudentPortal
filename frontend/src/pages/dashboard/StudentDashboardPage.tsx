import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { RoleEnum } from "../../models/Enums";
import type { Subject } from "../../models/SubjectModel";
import type { Grade } from "../../models/GradeModel";
import { getStudentSubjectsAndGrades } from "../../services/api/studentService";

// Tip za podatke o predmetu i ocenama
type StudentSubjectData = {
  subject: Subject;
  grades: Grade[];
};

const StudentDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [studentData, setStudentData] = useState<StudentSubjectData[]>([]);

  useEffect(() => {
    if (user?.UserRole === RoleEnum.Student && user?.Id) {
      const data = getStudentSubjectsAndGrades(user.Id);
      setStudentData(data);
    }
  }, [user]);

  if (!user || user.UserRole !== RoleEnum.Student) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger text-center">
          <h3>Pristup zabranjen</h3>
          <p>Nemate dozvolu za pristup ovoj stranici.</p>
        </div>
      </div>
    );
  }

  // Izmenjena funkcija za izračunavanje aritmetičke sredine
  const getAverageGrade = (grades: Grade[]): number | null => {
    // Filtrirajemo obrisane ocene
    const validGrades = grades.filter((grade) => !grade.IsDeleted);

    if (validGrades.length === 0) {
      return null;
    }

    const total = validGrades.reduce(
      (sum, grade) => sum + grade.StudentGrade,
      0
    );
    const average = total / validGrades.length;

    // Zaokružujemo na najbliži ceo broj i vraćamo
    return Math.round(average);
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Studentski Dashboard</h2>
      <h4 className="mb-4">
        Zdravo, {user.FirstName} {user.LastName}!
      </h4>

      <div className="row">
        {studentData.length > 0 ? (
          studentData.map((data) => {
            const finalGrade = getAverageGrade(data.grades);
            const isPassed = finalGrade !== null && finalGrade >= 6;
            const finalGradeMessage =
              finalGrade !== null ? finalGrade : "Nema unetih ocena";

            return (
              <div key={data.subject.Id} className="col-md-6 mb-4">
                <div className="card h-100">
                  <div className="card-header bg-primary text-white">
                    <h5 className="card-title mb-0">
                      {data.subject.SubjectName}
                    </h5>
                  </div>
                  <div className="card-body">
                    <p className="card-text">
                      <span className="fw-bold">Profesor:</span>{" "}
                      {data.subject.ProfessorFirstName}{" "}
                      {data.subject.ProfessorLastName}
                    </p>
                    <p className="card-text">
                      <span className="fw-bold">Status:</span>{" "}
                      {isPassed ? (
                        <span className="badge bg-success">Položeno</span>
                      ) : (
                        <span className="badge bg-danger">Nepoloženo</span>
                      )}
                    </p>
                    <p className="card-text">
                      <span className="fw-bold">Konačna ocena:</span>{" "}
                      {finalGradeMessage}
                    </p>
                  </div>
                  <div className="card-footer">
                    <button
                      className="btn btn-sm btn-info"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#grades-${data.subject.Id}`}
                      aria-expanded="false"
                      aria-controls={`grades-${data.subject.Id}`}
                    >
                      Prikaži sve ocene
                    </button>
                    <div
                      className="collapse mt-2"
                      id={`grades-${data.subject.Id}`}
                    >
                      <ul className="list-group list-group-flush">
                        {data.grades.map((grade) => (
                          <li
                            key={grade.Id}
                            className="list-group-item d-flex justify-content-between align-items-center"
                          >
                            <div>
                              Ocena: {grade.StudentGrade}
                              {grade.IsConfirmed && (
                                <span className="badge bg-secondary ms-2">
                                  Potvrđeno
                                </span>
                              )}
                            </div>
                            <span className="text-muted fst-italic">
                              {new Date().toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-12">
            <div className="alert alert-info">
              Još uvek niste upisani na nijedan predmet.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboardPage;
