# UI Testing Report

**Tool:** Vitest + React Testing Library + user-event
**Date:** 2026-07-08
**Scope:** Frontend (React) — `frontend/src/pages`

## Setup
- `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event` added as dev
  dependencies.
- Test environment configured in `vite.config.js` (`environment: 'jsdom'`,
  setup file at `src/test/setup.js`).
- Run via `npm run test` (or `frontend/package.json` → `"test": "vitest run"`).

## Coverage

| Component | Tests | What's covered |
|---|---|---|
| `Dashboard.jsx` | 5 | Loading state, successful data render, fetch error handling, empty state, auth-aware greeting |
| `Signup.jsx` | 6 | Empty-field validation, password-length validation, password-match validation, successful API call + success message, failed API call + error message |
| `Login.jsx` | 3 | Empty-field validation, successful login + redirect, failed login + error message |

**Total: 14/14 tests passing.**

## Bug Found: Unlinked form labels (accessibility)
While writing tests against `Signup.jsx` and `Login.jsx`, `getByLabelText`
queries failed because `<label>` elements had no `htmlFor` attribute and
inputs had no matching `id` — meaning screen readers and assistive tech
couldn't reliably associate labels with their fields either, not just
Testing Library.

**Fix applied:** added matching `id`/`htmlFor` pairs to all fields:
- `Signup.jsx`: `signup-username`, `signup-email`, `signup-phone`,
  `signup-password`, `signup-confirm-password`
- `Login.jsx`: `login-username`, `login-password`

## Approach
- All API calls (`axiosClient`) are mocked — tests don't require a running
  backend, so they're fast and deterministic.
- Context providers (`AuthContext`, `ThemeContext`) and hooks (`usePageMeta`)
  are mocked at the module level to isolate the component under test.
- Tests interact with the UI the way a user would (`userEvent.type`,
  `userEvent.click`) rather than calling internal component methods
  directly, so they verify actual rendered behavior.

## Known Limitations / Out of Scope
- No visual regression testing (e.g. Percy, Chromatic screenshots).
- No end-to-end browser testing (e.g. Cypress/Playwright) — these are
  component-level tests, not full user-journey tests through a real
  browser against a real backend.
- Only 3 of ~30+ page components have test coverage so far (`Dashboard`,
  `Signup`, `Login`) — chosen as representative examples (a data-heavy
  dashboard and two form-driven auth screens). Other pages follow the
  same pattern and can be added incrementally.

## How to Run
```powershell
cd frontend
npm run test
```