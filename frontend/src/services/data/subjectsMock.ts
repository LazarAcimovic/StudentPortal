import type { Subject } from "../../models/SubjectModel";

export const MOCK_SUBJECTS: Subject[] = [
  {
    Id: 1,
    SubjectName: "Matematika",
    Etcs: 6,
    ProfessorId: 3,
    ProfessorFirstName: "Petar",
    ProfessorLastName: "Petrović",
    IsDeleted: false,
    CreatedAt: new Date(),
  },
  {
    Id: 2,
    SubjectName: "Programiranje 1",
    Etcs: 8,
    ProfessorId: 7,
    ProfessorFirstName: "Stefan",
    ProfessorLastName: "Stefanović",
    IsDeleted: false,
    CreatedAt: new Date(),
  },
  {
    Id: 3,
    SubjectName: "Baze Podataka",
    Etcs: 7,
    ProfessorId: 3,
    ProfessorFirstName: "Petar",
    ProfessorLastName: "Petrović",
    IsDeleted: false,
    CreatedAt: new Date(),
  },
];
