import { z } from "zod";

// Mirrors EnrollmentCreateDtoValidator: both ids are required GUID strings.
export const enrollmentCreateSchema = z.object({
  StudentId: z.string().min(1, "Student is required."),
  SubjectId: z.string().min(1, "Subject is required."),
});

export type EnrollmentCreateFieldErrors = Partial<
  Record<keyof z.infer<typeof enrollmentCreateSchema>, string[]>
>;
