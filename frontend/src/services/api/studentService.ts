import type { User } from "../../models/UserModel";
import type { Subject } from "../../models/SubjectModel";
import type { Grade, CreateGrade, UpdateGrade } from "../../models/GradeModel";
import { MOCK_STUDENTS } from "../data/studentMock";
import { MOCK_ENROLLMENTS } from "../data/enrollmentsMock";
import { MOCK_SUBJECTS } from "../data/subjectsMock";
import { MOCK_GRADES } from "../data/gradeMock";
import { RoleEnum } from "../../models/Enums";

export const getStudents = (userRole: RoleEnum, subjectId?: number): User[] => {
  let students: User[] = [];

  if (userRole === RoleEnum.Admin) {
    students = MOCK_STUDENTS;
  } else if (userRole === RoleEnum.Professor) {
    if (subjectId) {
      // console.log(subjectId);
      const enrolledStudentIds = MOCK_ENROLLMENTS.filter(
        (e) => e.SubjectId === subjectId
      ).map((e) => e.StudentId);
      students = MOCK_STUDENTS.filter((student) =>
        enrolledStudentIds.includes(student.Id)
      );
    } else {
      // Prazna lista studenata ako profesor nije odabrao predmet
      students = [];
    }
  }
  console.log(students);

  return students;
};

export const getProfessorSubjects = (professorId: number): Subject[] => {
  return MOCK_SUBJECTS.filter((s) => s.ProfessorId === professorId);
};

export const getGradesByStudentAndSubject = (
  studentId: number,
  subjectId: number
): Grade[] => {
  const enrollment = MOCK_ENROLLMENTS.find(
    (e) => e.StudentId === studentId && e.SubjectId === subjectId
  );

  if (!enrollment) {
    return [];
  }

  return MOCK_GRADES.filter(
    (grade) => grade.EnrollmentId === enrollment.Id && !grade.IsDeleted
  );
};

export const createGrade = (newGrade: CreateGrade): Grade | Error => {
  const enrollment = MOCK_ENROLLMENTS.find(
    (e) => e.Id === newGrade.EnrollmentId
  );
  if (!enrollment) return new Error("Upis nije pronađen.");

  const student = MOCK_STUDENTS.find((s) => s.Id === enrollment.StudentId);
  const subject = MOCK_SUBJECTS.find((s) => s.Id === enrollment.SubjectId);
  if (!student || !subject)
    return new Error("Podaci o studentu ili predmetu nisu pronađeni.");

  const gradeId =
    MOCK_GRADES.length > 0 ? Math.max(...MOCK_GRADES.map((g) => g.Id)) + 1 : 1;

  const grade: Grade = {
    Id: gradeId,
    EnrollmentId: newGrade.EnrollmentId,
    StudentGrade: newGrade.Grade,
    Comment: newGrade.Comment || "",
    StudentFirstName: student.FirstName,
    StudentLastName: student.LastName,
    SubjectName: subject.SubjectName,
    IsConfirmed: false,
    IsDeleted: false,
  };
  MOCK_GRADES.push(grade);
  return grade;
};

export const updateGrade = (
  gradeId: number,
  updatedData: UpdateGrade
): Grade | Error => {
  const gradeToUpdate = MOCK_GRADES.find((g) => g.Id === gradeId);
  if (!gradeToUpdate) return new Error("Ocena nije pronađena.");
  if (gradeToUpdate.IsConfirmed)
    return new Error("Potvrđena ocena se ne može izmeniti.");

  gradeToUpdate.StudentGrade = updatedData.StudentGrade;
  gradeToUpdate.Comment = updatedData.Comment || "";

  return gradeToUpdate;
};

// Funkcija za logičko brisanje ocene
export const deleteGrade = (gradeId: number): boolean => {
  const gradeToDelete = MOCK_GRADES.find((g) => g.Id === gradeId);
  if (gradeToDelete && !gradeToDelete.IsConfirmed) {
    gradeToDelete.IsDeleted = true;
    return true;
  }
  return false;
};

// Funkcija za potvrđivanje ocene
export const confirmGrade = (gradeId: number): Grade | Error => {
  const gradeToConfirm = MOCK_GRADES.find((g) => g.Id === gradeId)!;
  if (gradeToConfirm.IsConfirmed) return new Error("Ocena je već potvrđena.");

  gradeToConfirm.IsConfirmed = true;
  return gradeToConfirm;
};

//StudentDashboard functionalities

export const getStudentSubjectsAndGrades = (
  studentId: number
): { subject: Subject; grades: Grade[] }[] => {
  // getting all the students subjects id's
  const enrollments = MOCK_ENROLLMENTS.filter((e) => e.StudentId === studentId);

  // Za svaki upis, pronađi predmet i ocene
  const studentData = enrollments.map((enrollment) => {
    const subject = MOCK_SUBJECTS.find((s) => s.Id === enrollment.SubjectId);
    if (!subject) return null;

    // Dobij ocene vezane za ovaj upis
    const grades = MOCK_GRADES.filter(
      (g) => g.EnrollmentId === enrollment.Id && !g.IsDeleted
    );

    return {
      subject: subject,
      grades: grades,
    };
  });

  return studentData.filter((data) => data !== null) as {
    subject: Subject;
    grades: Grade[];
  }[];
};
