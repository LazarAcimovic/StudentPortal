import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "Maximum 50 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Maximum 50 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .max(100, "Maximum 100 characters")
    .email("Invalid email format")
    .optional(),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(12, "New password must be at least 12 characters.")
      .max(128, "New password must not exceed 128 characters.")
      .regex(/[A-Z]/, "New password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "New password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "New password must contain at least one number.")
      .regex(/[!@#$%^&*]/, "New password must contain at least one special character (!@#$%^&*).")
      .refine((p) => !p.includes(' '), "New password must not contain spaces."),
    confirmNewPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
