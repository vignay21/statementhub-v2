# StatementHub v2 📊

**StatementHub v2** is a modern, high-performance financial statement analysis and reconciliation platform. It allows businesses and individuals to import, parse, categorize, and analyze bank statements from multiple financial institutions seamlessly in one consolidated dashboard.

---

## 🌟 Key Features

### 1. Multi-Bank Statement Parsing & Ingestion
- **Automatic Bank Detection**: Supports **Canara Bank**, **ICICI Bank**, **HDFC Bank**, **SBI**, **Axis Bank**, **Kotak Bank**, and generic bank statements.
- **Format Agnostic**: High-speed client-side ingestion of Excel (`.xlsx`, `.xls`) and CSV files.
- **Smart Header Detection**: Resilient parsing that identifies transaction data headers regardless of bank-specific statement preamble rows or metadata.
- **Intelligent Field Normalization**: Normalizes dates (supports multiple Indian and international date formats) and cleans debit/credit balances into standardized transaction records.

### 2. Business Intelligence & Automation
- **UTR & Reference Extraction**: Accurately extracts UTRs, UPI RRNs, Cheque numbers, and transaction IDs from complex narration strings.
- **Contra Transaction Detection**: Automatically flags self-transfers between user-owned accounts to prevent double-counting in cash flow calculations.
- **Fixed Deposit (FD) Detection**: Detects FD booking, renewal, and liquidation transactions.
- **Fingerprinting & Deduplication**: SHA-like deterministic fingerprinting ensures duplicate statements or overlapping date ranges don't inflate transaction figures.
- **Counterparty & Party Match**: Extracts counterparty names from transaction narrations and maintains a persistent directory of counterparties.

### 3. Comprehensive Search & Autocomplete
- **Multi-Mode Search Engine**:
  - **UTR / Reference**: Search directly by reference number, UTR, or UPI RRN.
  - **Date**: Search by exact transaction date (`DD-MM-YYYY`).
  - **Amount**: Search by exact transaction value.
  - **Party Name**: Filter by assigned vendor or counterparty.
  - **Universal**: Freeform multi-field search across descriptions, parties, banks, and amounts.
- **Interactive Autocomplete with Keyboard Navigation**:
  - `↑` / `↓` Arrow keys to navigate suggestions.
  - `Enter` / `Tab` to select a highlighted item.
  - `Escape` or click outside to dismiss.
  - `Ctrl + F` / `Cmd + F` global shortcut to immediately focus and select the search bar.

### 4. Cash Flow & Financial Analytics
- **Instant KPI Metrics**: Real-time totals for Total Inflow (Credits), Total Outflow (Debits), Net Flow, Contra Volume, and Active Counterparties.
- **Interactive Visualizations**: Monthly cash flow bar and line charts powered by Recharts.
- **Period Filtering**: Filter transactions by *Today*, *Last 7 Days*, *Last 30 Days*, *Current Month*, *Quarter*, *Financial Year*, or a custom date range.
- **Bank-wise Legend**: Color-coded badges and filtering to isolate transactions from specific bank accounts.

### 5. AI Counterparty Assistant (Optional)
- Powered by **Google Gemini API** (`@google/generative-ai`).
- Scans unassigned transaction descriptions to propose clean counterparty mappings with confidence scoring (High / Medium / Low).
- Bulk approve or reject AI-generated suggestions with a single click.

### 6. Storage & Data Portability
- **Supabase Cloud Integration**: Real-time cloud sync with PostgreSQL.
- **Storage Capacity Tracker**: Visual gauge monitoring database usage against free-tier capacity limits.
- **Full Backup & Restore**: One-click export to JSON / CSV and safe restore capabilities.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) icons
- **Table & Data**: [@tanstack/react-table](https://tanstack.com/table/v8)
- **File Parsers**: [PapaParse](https://www.papaparse.com/) (CSV), [SheetJS xlsx](https://sheetjs.com/) (Excel)
- **Charts**: [Recharts](https://recharts.org/)
- **Database & Sync**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`)
- **AI**: [Google Gemini Generative AI](https://ai.google.dev/)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (Node.js 20+ recommended)
- `npm` or `pnpm` or `yarn`

### 1. Clone & Install Dependencies

```bash
cd StatementHub-v2
npm install --legacy-peer-deps
```

### 2. Environment Variables

Create a `.env.local` file in the project root based on `.env.example`:

```bash
cp .env.example .env.local
```

Configure your environment keys:

```env
# Supabase Cloud Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Gemini API Key (Optional, for AI Assistant)
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Run the Development Server

#### On Windows:
You can use the provided batch script:
```cmd
run_v2.bat
```
Or execute via npm:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| `Ctrl + F` / `Cmd + F` | Focus and highlight the search bar from anywhere on the page |
| `↓` (Arrow Down) | Navigate down the suggestion list in the search bar |
| `↑` (Arrow Up) | Navigate up the suggestion list in the search bar |
| `Enter` | Select the currently highlighted suggestion |
| `Escape` | Dismiss the autocomplete dropdown |
| `Tab` | Quick-select highlighted suggestion and tab to next control |

---

## 📁 Directory Structure

```text
StatementHub-v2/
├── src/
│   ├── app/                      # Next.js App Router (pages & API routes)
│   │   ├── api/                  # Backend endpoints (AI, Backup, Storage, Transactions)
│   │   ├── layout.tsx            # Root application layout
│   │   └── page.tsx              # Main dashboard
│   ├── components/
│   │   ├── ai/                   # AI Party Assistant modal
│   │   ├── cashflow/             # Cashflow charts & KPI cards
│   │   ├── dashboard/            # Search bar, transaction tables, filters bar
│   │   ├── party/                # Counterparty manager
│   │   ├── storage/              # Backup & storage capacity components
│   │   ├── ui/                   # Reusable UI primitives (Buttons, Inputs, Cards)
│   │   └── upload/               # File dropzone & statement uploader
│   ├── lib/
│   │   ├── ai/                   # Gemini API client & party suggestion engine
│   │   ├── business/             # Deduplication, Contra & FD detection, UTR refinement
│   │   ├── formatters/           # Currency and date formatters
│   │   ├── parsers/              # Bank detection, CSV & Excel parsers
│   │   └── supabase/             # Supabase clients & queries
│   └── types/                    # TypeScript interfaces & types
├── .env.example                  # Template for environment variables
├── package.json                  # Dependencies and scripts
└── run_v2.bat                    # Windows startup script
```

---

## 📄 License

Private & Proprietary. All rights reserved.
