import { z } from "zod";
import { USER_ROLES } from "../../../shared/constants/constants";

// Mirrors the backend AdminCreateUserDtoValidator (FluentValidation). This is the
// first of the two validation layers; the backend validator remains the real
// security boundary. Password messages are kept byte-for-byte identical to the
// backend so the user sees the same text whichever layer rejects the input.
export const createUserSchema = z
  .object({
    FirstName: z
      .string()
      .min(1, "First name is required.")
      .max(50, "First name must not exceed 50 characters."),
    LastName: z
      .string()
      .min(1, "Last name is required.")
      .max(50, "Last name must not exceed 50 characters."),
    Email: z
      .string()
      .min(1, "Email is required.")
      .max(100, "Email must not exceed 100 characters.")
      .email("Email must be a valid email address."),
    Password: z
      .string()
      .min(12, "Password must be at least 12 characters.")
      .max(128, "Password must not exceed 128 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number.")
      .regex(/[!@#$%^&*]/, "Password must contain at least one special character (!@#$%^&*).")
      .refine((p) => !p.includes(" "), "Password must not contain spaces."),
    UserRole: z.number(),
    IndexNumber: z
      .string()
      .max(20, "Index number must not exceed 20 characters.")
      .optional(),
  })
  // Students must have an index number; professors never do.
  .refine(
    (data) =>
      data.UserRole !== USER_ROLES.Student ||
      (data.IndexNumber?.trim().length ?? 0) > 0,
    { message: "Index number is required.", path: ["IndexNumber"] }
  );

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
