export interface Subject {
  Id: number;
  SubjectName: string;
  ECTS: number;
  ProfessorId: number;
  ProfessorFirstName: string;
  ProfessorLastName: string;
  CreatedAt?: Date;
  IsDeleted: boolean;
}

export interface CreateSubject {
  SubjectName: string;
  ECTS: number;
  ProfessorId: number;
}

export interface UpdateSubject {
  Id: number;
  SubjectName: string;
  ECTS: number;
  ProfessorId: number;
  IsDeleted: boolean;
}
