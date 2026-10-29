import { describe, it, expect } from "vitest";
import { createUserSchema } from "./userSchemas";
import { USER_ROLES } from "../../../shared/constants/constants";

const validStudent = {
  FirstName: "Ana",
  LastName: "Anić",
  Email: "ana@example.com",
  Password: "TempPass!2024",
  UserRole: USER_ROLES.Student,
  IndexNumber: "E/123/22",
};

describe("createUserSchema", () => {
  it("accepts a valid student payload", () => {
    expect(createUserSchema.safeParse(validStudent).success).toBe(true);
  });

  it("requires an index number for students", () => {
    const result = createUserSchema.safeParse({
      ...validStudent,
      IndexNumber: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.IndexNumber?.[0]).toBe(
        "Index number is required."
      );
    }
  });

  it("does not require an index number for professors", () => {
    const result = createUserSchema.safeParse({
      ...validStudent,
      UserRole: USER_ROLES.Professor,
      IndexNumber: "",
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ["d", "Password must be at least 12 characters."],
    ["alllowercase1!", "Password must contain at least one uppercase letter."],
    ["ALLUPPERCASE1!", "Password must contain at least one lowercase letter."],
    ["NoDigitsHere!!", "Password must contain at least one number."],
    ["NoSpecialChar12", "Password must contain at least one special character (!@#$%^&*)."],
    ["Has Space 12!x", "Password must not contain spaces."],
  ])("rejects password %j with the mirrored message", (password, message) => {
    const result = createUserSchema.safeParse({
      ...validStudent,
      Password: password,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.Password).toContain(message);
    }
  });
});
