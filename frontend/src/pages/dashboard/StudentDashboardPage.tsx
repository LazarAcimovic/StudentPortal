import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "../../store/authStore";
import { RoleEnum } from "../../models/Enums";
import type { Subject } from "../../models/SubjectModel";
import type { Grade } from "../../models/GradeModel";
import { getStudentSubjectsAndGrades } from "../../services/api/studentService";

type StudentSubjectData = {
  enrollmentId: number;
  subject: Subject;
  grades: Grade[];
};

const StudentDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [studentData, setStudentData] = useState<StudentSubjectData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (user?.userRole === RoleEnum.Student && user?.id) {
        setIsLoading(true);
        setError(null);
        try {
          const data = await getStudentSubjectsAndGrades(user.id);
          setStudentData(data);
        } catch (err) {
          console.error("Greška pri dohvatanju podataka:", err);
          setError("Došlo je do greške prilikom dohvatanja podataka.");
          setStudentData([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchStudentData();
  }, [user]);

  const getSubjectStatus = (
    grades: Grade[]
  ): { grade: number | null; isPassed: boolean } => {
    const confirmedGrade = grades.find((g) => g.isConfirmed && !g.isDeleted);

    if (confirmedGrade) {
      return {
        grade: confirmedGrade.studentGrade,
        isPassed: confirmedGrade.studentGrade >= 6,
      };
    }

    return { grade: null, isPassed: false };
  };

  const { totalAverageGrade, passedExams, totalEtcs } = useMemo(() => {
    const passedGrades: number[] = [];
    let passedExamsCount = 0;
    let totalEtcsCount = 0;

    studentData.forEach((data) => {
      const { grade, isPassed } = getSubjectStatus(data.grades);

      if (isPassed) {
        if (grade !== null) {
          passedGrades.push(grade);
        }
        passedExamsCount++;
        totalEtcsCount += data.subject.ects;
      }
    });

    const totalGradeSum = passedGrades.reduce((sum, g) => sum + g, 0);
    const average =
      passedGrades.length > 0 ? totalGradeSum / passedGrades.length : 0;
    const roundedAverage = Math.round(average);

    return {
      totalAverageGrade: roundedAverage,
      passedExams: passedExamsCount,
      totalEtcs: totalEtcsCount,
    };
  }, [studentData]);

  if (!user || user.userRole !== RoleEnum.Student) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger text-center">
          <h3>Pristup zabranjen</h3>
          <p>Nemate dozvolu za pristup ovoj stranici.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4 className="mt-2">Učitavanje podataka...</h4>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger text-center">
          <h3>Greška</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Studentski Dashboard</h2>
      <h4 className="mb-4">
        Zdravo, {user.firstName} {user.lastName}!
      </h4>

      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Moji podaci</h5>
        </div>
        <div className="card-body">
          <p>
            <span className="fw-bold">Ime i prezime:</span> {user.firstName}{" "}
            {user.lastName}
          </p>
          <p>
            <span className="fw-bold">Email:</span> {user.email}
          </p>
          <p>
            <span className="fw-bold">Broj indeksa:</span>{" "}
            {user.indexNumber || "Nije unet"}
          </p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0">Statistike studija</h5>
        </div>
        <div className="card-body">
          <div className="row text-center">
            <div className="col-md-4">
              <div className="p-3 border rounded">
                <h5>Prosečna ocena</h5>
                <h3 className="fw-bold text-success">
                  {totalAverageGrade || "N/A"}
                </h3>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded">
                <h5>Položenih ispita</h5>
                <h3 className="fw-bold text-primary">{passedExams}</h3>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded">
                <h5>Osvojenih ESPB</h5>
                <h3 className="fw-bold text-info">{totalEtcs}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h4 className="mb-4">Moji predmeti</h4>
      <div className="row">
        {studentData.length > 0 ? (
          studentData.map((data) => {
            const { grade: finalGrade, isPassed } = getSubjectStatus(
              data.grades
            );
            const finalGradeMessage =
              finalGrade !== null ? finalGrade : "Nema unete potvrđene ocene";

            return (
              <div key={data.enrollmentId} className="col-md-6 mb-4">
                <div className="card h-100">
                  <div className="card-header bg-primary text-white">
                    <h5 className="card-title mb-0">
                      {data.subject.subjectName}
                    </h5>
                  </div>
                  <div className="card-body">
                    <p className="card-text">
                      <span className="fw-bold">Profesor:</span>{" "}
                      {data.subject.professorFirstName}{" "}
                      {data.subject.professorLastName}
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
                      data-bs-target={`#grades-${data.enrollmentId}`}
                      aria-expanded="false"
                      aria-controls={`grades-${data.enrollmentId}`}
                    >
                      Prikaži sve ocene
                    </button>
                    <div
                      className="collapse mt-2"
                      id={`grades-${data.enrollmentId}`}
                    >
                      <ul className="list-group list-group-flush">
                        {data.grades.map((grade) => (
                          <li
                            key={grade.id}
                            className="list-group-item d-flex justify-content-between align-items-center"
                          >
                            <div>
                              Ocena: {grade.studentGrade}
                              {grade.isConfirmed ? (
                                <span className="badge bg-primary ms-2">
                                  Potvrđena
                                </span>
                              ) : (
                                <span className="badge bg-secondary ms-2">
                                  Preliminarna
                                </span>
                              )}
                              {grade.comment && (
                                <span className="d-block text-muted fst-italic mt-1">
                                  Komentar: "{grade.comment}"
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
