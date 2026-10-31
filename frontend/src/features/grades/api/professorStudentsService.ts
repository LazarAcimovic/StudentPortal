import axiosClient from '../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../config/constants';
import type { PagedStudentsResult, ProfessorStudentRow } from '../../user/models/professor/professorDashboard';

interface RawPagedStudents {
  items: {
    enrollmentId: string;
    studentId: string;
    firstName: string;
    lastName: string;
    indexNumber: string | null;
    gradeState: string;
    finalGrade: number | null;
    hasActiveAppeal: boolean;
  }[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export async function getPagedStudents(
  subjectId: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<PagedStudentsResult> {
  const res = await axiosClient.get<RawPagedStudents>(
    `${API_ROUTES.PROFESSOR_SUBJECT_STUDENTS}/${subjectId}/students`,
    { params: { page, pageSize }, signal }
  );

  const items: ProfessorStudentRow[] = res.data.items.map(r => ({
    enrollmentId: r.enrollmentId,
    studentId: r.studentId,
    firstName: r.firstName,
    lastName: r.lastName,
    indexNumber: r.indexNumber,
    gradeState: r.gradeState as ProfessorStudentRow['gradeState'],
    finalGrade: r.finalGrade,
    hasActiveAppeal: r.hasActiveAppeal,
  }));

  return { items, totalCount: res.data.totalCount, page: res.data.page, pageSize: res.data.pageSize };
}
