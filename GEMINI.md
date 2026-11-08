# StatementHub v2 — Agent Instructions & Project Guidelines

> This file contains project-specific instructions and rules for Antigravity (Google DeepMind agent).
> Antigravity automatically discovers and loads this file at the start of every session.
> You can add, edit, or customize instructions below at any time.

---

## 1. User Custom Instructions
*(Add your custom instructions, preferences, and rules below. The agent will strictly follow them across all turns.)*

- **Explain & Confirm Before Fixing:** When a problem or task is identified, first explain the problem and the proposed fix clearly. Do NOT implement any code changes until the user gives explicit approval (e.g. says "yes", "proceed", or confirms).
- **Explicit Permission Before Git Push:** Always ask for explicit permission from the user before executing `git push` to push code to GitHub or any remote repository.
- **Unpushed Commits Reminder:** Proactively check and remind the user if there are unpushed local commits or uncommitted changes before starting any new task.
- **Party Name Mapping:** Always ensure narration mappings (e.g. `BY CASH -PARKAL SIKINDER` -> `CASH DEPOSIT`) persist in `party_mappings` and auto-apply to future transactions.
- **Performance & Responsiveness:** UI party edits must remain instantaneous (optimistic update with zero perceptible delay on Enter/Select).
- **Environment & Build Safety:** On Windows, run all `npm` and `npx` commands through `cmd /c` to prevent PowerShell execution policy restrictions.
- **Testing Before Pushing:** Always run unit tests (`cmd /c npm test`) and production build check (`cmd /c npm run build`) before committing and pushing code.
- **No Background Local Servers:** The application is hosted live on Vercel. After building or testing the application locally, do NOT leave background dev or production servers running (e.g. `next start`); terminate them immediately.

---

## 2. Codebase Architecture
- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide icons.
- **Database:** Supabase PostgreSQL (`transactions`, `party_mappings`).
- **Parsing Pipelines:**
  - `src/lib/parsers/normalizer.ts`: CSV / Excel statements.
  - `src/app/api/parsers/pdf/route.ts`: Multi-bank PDF statement extractor (Google Gemini).
  - `src/lib/parsers/json-parser.ts`: JSON statements.
- **Business Logic:**
  - `src/lib/business/party-resolver.ts`: Automatic narration to party name matching.
  - `src/lib/business/party-match-key.ts`: Normalized counterparty identifier extraction.
  - `src/lib/business/utr-refiner.ts`: Strict IFSC-code cleaning from UTR fields.
  - `src/lib/business/deduplication.ts`: Fingerprint & signature deduplication engine.

---

## 3. Deployment & Live Environment
- **Live Production URL:** https://statementhub-v2.vercel.app/
- **Hosting Platform:** Vercel (Production)

