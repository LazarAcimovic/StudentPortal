import type { LoginFormValues } from "../models/schemas/loginSchema";

export const LOGIN_INITIAL_VALUES: LoginFormValues = {
  email: "",
  password: "",
};

export const LOGIN_INITIAL_TOUCHED: Record<keyof LoginFormValues, boolean> = {
  email: false,
  password: false,
};

export const LOGIN_INITIAL_SERVER_ERROR: string | null = null;
export const LOGIN_INITIAL_IS_SUBMITTING = false;
