import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../test/helpers/renderWithProviders";
import UserCreateForm from "./UserCreateForm";
import type { AddUserResult } from "../../api/userService";

const VALID_PASSWORD = "TempPass!2024";

const makeOnSave = (result: AddUserResult) =>
  vi.fn().mockResolvedValue(result);

async function fillValidStudent(ue: ReturnType<typeof userEvent.setup>) {
  await ue.type(screen.getByLabelText(/first name/i), "Ana");
  await ue.type(screen.getByLabelText(/last name/i), "Anić");
  await ue.type(screen.getByLabelText(/^email$/i), "ana@example.com");
  await ue.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
  await ue.type(screen.getByLabelText(/index number/i), "E/123/22");
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("UserCreateForm validation", () => {
  it("shows a required error once a mandatory field is touched and left empty", async () => {
    renderWithProviders(
      <UserCreateForm onSave={makeOnSave({ ok: false })} onCancel={() => {}} />
    );
    const ue = userEvent.setup();

    expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();

    await ue.click(screen.getByLabelText(/^email$/i));
    await ue.tab();

    await waitFor(() =>
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    );
  });

  it("shows the mirrored password rule for a weak password", async () => {
    renderWithProviders(
      <UserCreateForm onSave={makeOnSave({ ok: false })} onCancel={() => {}} />
    );
    const ue = userEvent.setup();

    await ue.type(screen.getByLabelText(/^password$/i), "d");
    await ue.tab();

    await waitFor(() =>
      expect(
        screen.getByText(/password must be at least 12 characters/i)
      ).toBeInTheDocument()
    );
  });

  it("does not call onSave while the form is invalid", async () => {
    const onSave = makeOnSave({ ok: false });
    renderWithProviders(<UserCreateForm onSave={onSave} onCancel={() => {}} />);
    const ue = userEvent.setup();

    await ue.click(screen.getByRole("button", { name: /create/i }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("requires an index number for a student", async () => {
    renderWithProviders(
      <UserCreateForm onSave={makeOnSave({ ok: false })} onCancel={() => {}} />
    );
    const ue = userEvent.setup();

    await ue.click(screen.getByLabelText(/index number/i));
    await ue.tab();

    await waitFor(() =>
      expect(screen.getByText(/index number is required/i)).toBeInTheDocument()
    );
  });
});

describe("UserCreateForm submission", () => {
  it("submits the typed values when valid", async () => {
    const onSave = makeOnSave({
      ok: true,
      user: {
        id: '1',
        firstName: "Ana",
        lastName: "Anić",
        email: "ana@example.com",
        userRole: 0,
        isDeleted: false,
      },
    });
    renderWithProviders(<UserCreateForm onSave={onSave} onCancel={() => {}} />);
    const ue = userEvent.setup();

    await fillValidStudent(ue);
    await ue.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      FirstName: "Ana",
      LastName: "Anić",
      Email: "ana@example.com",
      Password: VALID_PASSWORD,
      UserRole: 0,
      IndexNumber: "E/123/22",
    });
  });

  it("renders a server-side duplicate-email error under the Email field", async () => {
    const onSave = makeOnSave({
      ok: false,
      fieldErrors: { Email: "A user with this email already exists." },
    });
    renderWithProviders(<UserCreateForm onSave={onSave} onCancel={() => {}} />);
    const ue = userEvent.setup();

    await fillValidStudent(ue);
    await ue.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/a user with this email already exists/i)
      ).toBeInTheDocument()
    );
  });
});
