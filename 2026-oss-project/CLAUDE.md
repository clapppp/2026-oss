# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check + production build (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # Preview production build
```

There are no tests configured in this project.

## Architecture

**아트패스 (ArtPass)** — a Korean government-style web app for artists to apply for art activity certification (예술활동증명). It is a frontend-only SPA with mock data; no real backend is connected yet.

### Routing

There is no router library. `App.tsx` manages page state with `useState<Page>()` and renders the correct page component based on the current value. Navigation happens by calling `setPage()` or the `navigateTo()` helper (which enforces auth guards). Pages: `main`, `apply`, `status`, `signup`, `login`, `mypage`.

### Auth

`src/context/AuthContext.tsx` provides `AuthProvider` and `useAuth()`. Auth is entirely mocked — login checks hardcoded credentials (`demo@artpass.kr` / `password1!`) and returns a hardcoded user. When integrating a real backend, replace the `login` and `updateUser` function bodies with API calls and remove `MOCK_CREDENTIALS` / `MOCK_USER`.

### Component hierarchy

```
src/components/
  common/       # Atoms: Button, Input, DatePicker, FileInput, Toast, ConfirmDialog, ArtPassLogo, ScrollToTop
  molecules/    # Composed of atoms: FormField, InfoRow, SelectCard, StepBar
  organisms/    # Composed of molecules: Header, Footer, FileSection, SummaryBox
src/pages/      # Full pages composed of organisms: MainPage, ApplyPage, ApplicationStatusPage, LoginPage, SignupPage, MyPage
```

Every component has a co-located `*.module.css` file. Global CSS variables (KRDS design system tokens) are defined in `src/index.css`.

### Apply flow (ApplyPage)

The most complex page. It is a 3-step wizard:
1. **Step 1** — confirm applicant identity (read from `useAuth`)
2. **Step 2** — select art categories (up to 3) and fill per-category work records
3. **Step 3** — review and submit

Category configuration (field definitions, minimum counts, hints) lives in `src/constants/categoryFormConfig.ts`. Category icons live in `src/constants/categories.tsx`. Validation logic including special cases for 문학 (literature) genre minimums and 만화 (manhwa) serial exceptions is inline in `ApplyPage.tsx`.

### Styling

- Design tokens follow the Korean government KRDS (범정부 디자인 시스템) with CSS custom properties prefixed `--krds-*`.
- Font stack: Pretendard → Noto Sans KR → system-ui.
- All component styles use CSS Modules (`*.module.css`). No CSS-in-JS, no Tailwind.

### Utilities

`src/utils/formatters.ts` — `formatPhone(v)` strips non-digits and formats as `010-XXXX-XXXX`.
