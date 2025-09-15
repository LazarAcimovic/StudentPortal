export interface Subject {
  Id: number;
  SubjectName: string;
  Etcs: number;
  ProfessorId: number;
  ProfessorFirstName: string;
  ProfessorLastName: string;
  CreatedAt?: Date;
  IsDeleted: boolean;
}

export interface CreateSubject {
  SubjectName: string;
  Etcs: number;
  ProfessorId: number;
}

export interface UpdateSubject {
  Id: number;
  SubjectName: string;
  Etcs: number;
  ProfessorId: number;
  IsDeleted: boolean;
}
