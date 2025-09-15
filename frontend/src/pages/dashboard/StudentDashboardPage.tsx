import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "../../store/authStore";
import { RoleEnum } from "../../models/Enums";
import type { Subject } from "../../models/SubjectModel";
import type { Grade } from "../../models/GradeModel";
import { getStudentSubjectsAndGrades } from "../../services/api/studentService";

// Tip za podatke o predmetu i ocenama, koji se dobijaju sa backend-a
type StudentSubjectData = {
  subject: Subject;
  grades: Grade[];
};

const StudentDashboardPage: React.FC = () => {
  // Stanja i store za čuvanje podataka
  const { user } = useAuthStore();
  const [studentData, setStudentData] = useState<StudentSubjectData[]>([]);

  // useEffect se poziva samo jednom kada se komponenta montira
  // i kada se 'user' promeni, kako bi se dohvatili podaci za studenta.
  useEffect(() => {
    // Proverava da li je korisnik student i da li ima ID pre poziva API-ja
    if (user?.UserRole === RoleEnum.Student && user?.Id) {
      const data = getStudentSubjectsAndGrades(user.Id);
      setStudentData(data);
    }
  }, [user]);

  // Funkcija za dobijanje finalne ocene predmeta i statusa.
  // Proverava da li postoji potvrđena ocena, a ako ne, vraća null.
  const getSubjectStatus = (
    grades: Grade[]
  ): { grade: number | null; isPassed: boolean } => {
    const confirmedGrade = grades.find((g) => g.IsConfirmed && !g.IsDeleted);

    if (confirmedGrade) {
      return {
        grade: confirmedGrade.StudentGrade,
        isPassed: confirmedGrade.StudentGrade >= 6,
      };
    }

    return { grade: null, isPassed: false };
  };

  // useMemo se koristi za keširanje izračunatih vrednosti (statistika)
  // Vrednosti se ponovo izračunavaju samo kada se promeni 'studentData'.
  const { totalAverageGrade, passedExams, totalEtcs } = useMemo(() => {
    const passedGrades: number[] = [];
    let passedExamsCount = 0;
    let totalEtcsCount = 0;

    studentData.forEach((data) => {
      const { grade, isPassed } = getSubjectStatus(data.grades);

      if (isPassed) {
        // Dodajemo ocenu u niz samo ako je ispit položen
        if (grade !== null) {
          passedGrades.push(grade);
        }
        passedExamsCount++;
        totalEtcsCount += data.subject.Etcs;
      }
    });

    // Računamo globalni prosek isključivo na osnovu položenih ispita
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

  // Rani povratak ako korisnik nema dozvolu
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

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Studentski Dashboard</h2>
      <h4 className="mb-4">
        Zdravo, {user.FirstName} {user.LastName}!
      </h4>

      {/* Sekcija 1: Korisnički profil */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Moji podaci</h5>
        </div>
        <div className="card-body">
          <p>
            <span className="fw-bold">Ime i prezime:</span> {user.FirstName}{" "}
            {user.LastName}
          </p>
          <p>
            <span className="fw-bold">Email:</span> {user.Email}
          </p>
          <p>
            <span className="fw-bold">Broj indeksa:</span>{" "}
            {user.IndexNumber || "Nije unet"}
          </p>
        </div>
      </div>

      {/* Sekcija 2: Ključne statistike */}
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

      {/* Sekcija 3: Pregled predmeta i ocena */}
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
                              {grade.IsConfirmed ? (
                                <span className="badge bg-primary ms-2">
                                  Potvrđena
                                </span>
                              ) : (
                                <span className="badge bg-secondary ms-2">
                                  Preliminarna
                                </span>
                              )}
                              {grade.Comment && (
                                <span className="d-block text-muted fst-italic mt-1">
                                  Komentar: "{grade.Comment}"
                                </span>
                              )}
                            </div>
                            <span className="text-muted fst-italic">
                              {/* Za sada koristimo fiksni datum */}
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
