export interface Subject {
  Id: number;
  SubjectName: string;
  Etcs: number;
  ProfessorId: number;
  IsDeleted: boolean;
  CreatedAt?: Date;
}

export interface SubjectDto {
  Id: number;
  SubjectName: string;
  Etcs: number;
  ProfessorId: number;
  ProfessorFirstName: string;
  ProfessorLastName: string;
  CreatedAt?: Date;
  IsDeleted?: boolean;
}

export interface CreateSubjectDto {
  SubjectName: string;
  Etcs: number;
  ProfessorId: number;
}

export interface UpdateSubjectDto {
  SubjectName: string;
  Etcs: number;
  ProfessorId: number;
  IsDeleted: boolean;
}
