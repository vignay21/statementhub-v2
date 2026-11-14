# StatementHub v2 — Agent Instructions & Project Guidelines

> This file contains project-specific instructions and rules for Antigravity (Google DeepMind agent).
> Antigravity automatically discovers and loads this file at the start of every session.
> You can add, edit, or customize instructions below at any time.

---

## 1. User Custom Instructions
*(Add your custom instructions, preferences, and rules below. The agent will strictly follow them across all turns.)*

- **Explain & Confirm Before Fixing:** When a problem or task is identified, first explain the problem and the proposed fix clearly. Do NOT implement any code changes until the user gives explicit approval (e.g. says "yes", "proceed", or confirms).
- **Auto-Commit and Push Upon Approval:** Once the user approves an implementation (e.g. says "yes", "proceed", or confirms), proceed with implementation, run unit tests and build checks, and then directly commit and `git push` the code to GitHub/remote. No separate confirmation is needed before pushing.
- **Unpushed Commits Reminder:** Proactively check and remind the user if there are unpushed local commits or uncommitted changes before starting any new task.
- **Party Name Mapping:** Always ensure narration mappings (e.g. `BY CASH -PARKAL SIKINDER` -> `CASH DEPOSIT`) persist in `party_mappings` and auto-apply to future transactions.
- **Performance & Responsiveness:** UI party edits must remain instantaneous (optimistic update with zero perceptible delay on Enter/Select).
- **Environment & Build Safety:** On Windows, run all `npm` and `npx` commands through `cmd /c` to prevent PowerShell execution policy restrictions.
- **Testing Before Pushing:** Always run unit tests (`cmd /c npm test`) and production build check (`cmd /c npm run build`) before committing and pushing code.
- **No Background Local Servers:** The application is hosted live on Vercel. After building or testing the application locally, do NOT leave background dev or production servers running (e.g. `next start`); terminate them immediately.

---

## 2. Business & Family Financial Context
*(Permanent profile & background context for personal advisory and business planning)*

- **User Profile:** 43-year-old female entrepreneur independently heading and operating the family wholesale pharmaceutical distribution business (**Lakshmi Devi Agencies**, Parkal/Warangal, Telangana; annual turnover ~₹4.56 Crore).
- **Family Structure:**
  - **Late Husband:** Rajender Komakula (deceased; former proprietor, transitioned to her leadership).
  - **Son 1:** Software Engineer earning **₹7 LPA** (pays **₹0 Income Tax** under New Tax Regime Section 87A rebate).
  - **Son 2:** In **MCA Final Year** (completing post-graduate studies).
- **Existing Loans & EMI Servicing Routes:**
  - **Kotak Home Loan (Hyderabad Property):** Outstanding principal balance ~₹1.00 Crore. Current EMI: **₹ 1,11,000 / month** (serviced via recurring transfer from personal HDFC Savings Account $\rightarrow$ Kotak Savings Account `...6180`, where it auto-debits).
  - **Canara Home Loan (Hanamkonda Property):** Current EMI: **₹ 37,458 / month** (auto-debited directly from Canara Bank Current Account `CNRB0006850`).
  - Total combined loan EMI burden: **~₹ 1.48 Lakhs / month**.
- **Banking Structure:**
  - **Canara Bank (`CNRB0006850`):** Core Business Current Account (customer receipts, pharma company supplier NEFTs, Canara home loan EMI).
  - **ICICI Bank (`...3098`):** Customer QR / UPI Collection Current Account.
  - **HDFC Bank:** Personal Savings Account in her own name (used as the Personal Wealth Hub for personal drawings, household, RD, PPF, Mutual Funds, and Kotak loan routing).

---

## 3. Codebase Architecture
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

## 4. Deployment & Live Environment
- **Live Production URL:** https://statementhub-v2.vercel.app/
- **Hosting Platform:** Vercel (Production)
