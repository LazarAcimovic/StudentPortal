import type { User } from "../../models/UserModel";
import { MOCK_STUDENTS } from "../data/studentMock";
import { MOCK_ENROLLMENTS } from "../data/enrollmentsMock";
import { MOCK_SUBJECTS } from "../data/subjectsMock";
import { RoleEnum } from "../../models/Enums";

//bad logic, will be corrected tomorrow
export const getStudents = (userRole: RoleEnum, userId?: number): User[] => {
  let students: User[] = [];

  if (userRole === RoleEnum.Admin) {
    students = MOCK_STUDENTS;
  } else if (userRole === RoleEnum.Professor && userId) {
    const professorSubjects = MOCK_SUBJECTS.filter(
      (s) => s.ProfessorId === userId
    );
    const professorSubjectIds = professorSubjects.map((s) => s.Id);

    const enrolledStudents = MOCK_ENROLLMENTS.filter((e) =>
      professorSubjectIds.includes(e.SubjectId)
    );
    const studentIds = [...new Set(enrolledStudents.map((e) => e.StudentId))];

    students = MOCK_STUDENTS.filter((student) =>
      studentIds.includes(student.Id)
    );
  }

  return students;
};
