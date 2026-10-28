import { z } from "zod";

export const subjectCreateSchema = z.object({
  SubjectName: z.string().min(1, "Subject Name is required").max(100, "Maximum 100 characters"),
  SubjectCode: z.string().min(1, "Subject Code is required").max(20, "Subject Code must be at most 20 characters"),
  ECTS: z.number({ invalid_type_error: "ECTS is required" }).int().min(1, "Minimum 1").max(30, "Maximum 30"),
  // ProfessorId is a GUID (the professor's user id), not a number.
  ProfessorId: z.string().min(1, "Professor is required"),
});

export const subjectEditSchema = subjectCreateSchema.extend({
  Id: z.string(),
  IsDeleted: z.boolean(),
});

export type SubjectCreateFieldErrors = Partial<Record<keyof z.infer<typeof subjectCreateSchema>, string[]>>;
export type SubjectEditFieldErrors = Partial<Record<keyof z.infer<typeof subjectEditSchema>, string[]>>;
