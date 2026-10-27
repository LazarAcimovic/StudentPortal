### Task 24 — `<PasswordInput>` primitive and a password toggle on every password field

#### Overview

`UI.md` §11.2 specifies a shared `<PasswordInput>` with a show/hide eye toggle, and §1 / §5 / §8.3 / §10 require it on **every** password field in the app (per D-001). The component does not exist in the codebase: no file references `PasswordInput`, so each password field is a bare `<input type="password">` and the change-password page cannot match UI §10 as written.

This task builds the primitive once and adopts it everywhere, which also closes the open box in 22b.9.

**Depends on:** nothing · **Blocks:** 22b.9's `<PasswordInput>` assertion

---

#### 24.1 — Frontend-component: the `<PasswordInput>` primitive

Rules: UI §11.2 (props, markup, internal toggle state, aria-label), UI §14 (icon-only buttons need an aria-label), Tech-Frontend §2 (no custom hooks beyond data-fetching — the toggle is local `useState`)
Not in scope: adopting it in any form — that is 24.2–24.4.
Docs to update: Tech-Frontend §1 (add the file to the `components/ui/` listing)
Verify: `npm run test -- PasswordInput`

- [x] `src/components/ui/PasswordInput.tsx` with exactly the props from UI §11.2: `id`, `name`, `value`, `onChange`, `onBlur?`, `autoComplete`, `required?`, `isInvalid?`.
- [x] Renders an `.input-group` with the `<input>` plus a `btn btn-outline-secondary` holding an inline eye SVG (no new icon package — Tech.md §1).
- [x] Internal `useState` toggles `type` between `password` and `text`.
- [x] The toggle button has `aria-label` "Show password" / "Hide password" reflecting current state, and `type="button"` so it never submits the form.
- [x] `isInvalid` adds `is-invalid` to the input so Bootstrap's `invalid-feedback` still renders (UI §2.3).
- Commit: `feat(frontend): reusable PasswordInput primitive with show/hide toggle`

---

#### 24.2 — Frontend-component: adopt it on the login form

Rules: PRD §5.2 (masked by default with a toggle), UI §5 (login page), D-001
Not in scope: changing the login error display, which stays an inline `alert alert-danger` (UI §5).
Docs to update: none
Verify: `npm run test -- LoginPage`

- [x] The login password field is a `<PasswordInput autoComplete="current-password">`.
- [x] Clicking the eye reveals and re-masks the currently entered value.
- [x] Validation errors still appear only after `touched` (UI §2.3).
- Commit: `feat(auth): use PasswordInput on the login form`

---

#### 24.3 — Frontend-component: adopt it on admin create-user

Rules: UI §8.3 (create-user form, password 12–128 with toggle), PRD §5.3
Not in scope: the edit-user form, which has no password field (UI §11.6).
Docs to update: none
Verify: `npm run test -- UserCreateForm`

- [x] The create-user password field is a `<PasswordInput autoComplete="new-password">`.
- [x] The existing ad-hoc toggle markup is removed in favour of the primitive.
- Commit: `refactor(admin): use PasswordInput on the create-user form`

---

#### 24.4 — Frontend-page: adopt it on the change-password page

Rules: UI §10 (three `<PasswordInput>` instances with their autoComplete values), UI §10.2 (Zod schema), PRD §5.10
Not in scope: the submit flow and sign-out-everywhere behaviour, which already work.
Docs to update: none
Verify: `npm run test -- ChangePasswordPage`

- [ ] Current password → `<PasswordInput autoComplete="current-password">`.
- [ ] New password → `<PasswordInput autoComplete="new-password">`, 12–128 characters.
- [ ] Confirm new password → `<PasswordInput autoComplete="new-password">`, must equal New password.
- [ ] Each field toggles independently — revealing one does not reveal the others.
- Commit: `feat(user): use PasswordInput on the change-password page`
