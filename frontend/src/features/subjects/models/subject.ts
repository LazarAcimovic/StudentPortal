export interface Subject {
  id: string;
  subjectName: string;
  subjectCode: string;
  ects: number;
  professorId: string;
  professorFirstName: string;
  professorLastName: string;
  createdAt?: Date;
  isDeleted: boolean;
}

export interface CreateSubject {
  SubjectName: string;
  SubjectCode: string;
  ECTS: number;
  ProfessorId: string; // GUID — never coerce with Number()
}

export interface UpdateSubject {
  Id: string; // GUID
  SubjectName: string;
  SubjectCode: string;
  ECTS: number;
  ProfessorId: string; // GUID — never coerce with Number()
  IsDeleted: boolean;
}
