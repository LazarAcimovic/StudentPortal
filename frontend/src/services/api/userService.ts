import type { CreateUser, User } from "../../models/UserModel";
import { MOCK_STUDENTS } from "../data/studentMock";
import { RoleEnum } from "../../models/Enums";

export const createStudent = (newUser: CreateUser): User | Error => {
  const existingUser = MOCK_STUDENTS.find((u) => u.Email === newUser.Email);
  if (existingUser) {
    return new Error("Korisnik sa tim email-om već postoji.");
  }

  const newUserId =
    MOCK_STUDENTS.length > 0
      ? Math.max(...MOCK_STUDENTS.map((u) => u.Id)) + 1
      : 1;

  const student: User = {
    Id: newUserId,
    FirstName: newUser.FirstName,
    LastName: newUser.LastName,
    Email: newUser.Email,
    UserPassword: newUser.UserPassword,
    IndexNumber: newUser.IndexNumber,
    UserRole: RoleEnum.Student,
    IsDeleted: false,
    CreatedAt: new Date(),
  };

  // const student1: User ={
  //   ...newUser,
  //   Id: newUserId,
  //   IsDeleted: false,
  //   CreatedAt: new Date(),
  // }

  MOCK_STUDENTS.push(student); // Dodajemo novog studenta u mock niz

  return student;
};
