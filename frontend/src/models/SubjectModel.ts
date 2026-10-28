export interface Subject {
  id: number;
  subjectName: string;
  subjectCode: string;
  ects: number;
  professorId: number;
  professorFirstName: string;
  professorLastName: string;
  createdAt?: Date;
  isDeleted: boolean;
}

export interface CreateSubject {
  SubjectName: string;
  SubjectCode: string;
  ECTS: number;
  ProfessorId: number;
}

export interface UpdateSubject {
  Id: number;
  SubjectName: string;
  SubjectCode: string;
  ECTS: number;
  ProfessorId: number;
  IsDeleted: boolean;
}
