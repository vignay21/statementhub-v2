export const HEADER_ALIASES = {
  date: [
    "transaction date",
    "txn date",
    "value date",
    "date",
    "posting date",
    "trans date",
  ],
  reference: [
    "utr",
    "utr no",
    "cheque. no./ref. no.",
    "cheque no.",
    "chq./ref.no.",
    "ref no",
    "reference no",
    "reference",
    "transaction id",
    "tran. id",
    "tran id",
    "chq no",
    "ref/chq no",
  ],
  description: [
    "transaction remarks",
    "description",
    "narration",
    "particulars",
    "remarks",
    "transaction details",
  ],
  type: [
    "cr/dr",
    "dr/cr",
    "cr / dr",
    "dr / cr",
    "type",
    "txn type",
    "transaction type",
  ],
  amount: [
    "transaction amount(inr)",
    "transaction amount (inr)",
    "transaction amount",
    "txn amount",
    "amount(inr)",
    "amount (inr)",
    "amount",
    "txn amt",
  ],
  debit: ["withdrawal amt", "withdrawal", "debit", "dr amount", "dr"],
  credit: ["deposit amt", "deposit", "credit", "cr amount", "cr"],
  balance: [
    "available balance(inr)",
    "available balance (inr)",
    "available balance",
    "closing balance",
    "balance",
    "bal",
  ],
} as const;

export interface BankStyle {
  name: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  rowBg: string;
  rowHoverBg: string;
}

export const BANK_STYLES: Record<string, BankStyle> = {
  "Canara Bank": {
    name: "Canara Bank",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    badgeBorder: "#10b981",
    badgeText: "#34d399",
    rowBg: "rgba(16, 185, 129, 0.08)",
    rowHoverBg: "rgba(16, 185, 129, 0.14)",
  },
  "ICICI Bank": {
    name: "ICICI Bank",
    badgeBg: "rgba(249, 115, 22, 0.15)",
    badgeBorder: "#f97316",
    badgeText: "#fb923c",
    rowBg: "rgba(249, 115, 22, 0.08)",
    rowHoverBg: "rgba(249, 115, 22, 0.14)",
  },
  "HDFC Bank": {
    name: "HDFC Bank",
    badgeBg: "rgba(14, 165, 233, 0.15)",
    badgeBorder: "#0ea5e9",
    badgeText: "#38bdf8",
    rowBg: "rgba(14, 165, 233, 0.08)",
    rowHoverBg: "rgba(14, 165, 233, 0.14)",
  },
  "SBI": {
    name: "SBI",
    badgeBg: "rgba(13, 148, 136, 0.15)",
    badgeBorder: "#0d9488",
    badgeText: "#2dd4bf",
    rowBg: "rgba(13, 148, 136, 0.08)",
    rowHoverBg: "rgba(13, 148, 136, 0.14)",
  },
  "Axis Bank": {
    name: "Axis Bank",
    badgeBg: "rgba(244, 63, 94, 0.15)",
    badgeBorder: "#f43f5e",
    badgeText: "#fb7185",
    rowBg: "rgba(244, 63, 94, 0.08)",
    rowHoverBg: "rgba(244, 63, 94, 0.14)",
  },
  "Kotak Bank": {
    name: "Kotak Bank",
    badgeBg: "rgba(239, 68, 68, 0.15)",
    badgeBorder: "#ef4444",
    badgeText: "#f87171",
    rowBg: "rgba(239, 68, 68, 0.08)",
    rowHoverBg: "rgba(239, 68, 68, 0.14)",
  },
};

export const DEFAULT_BANK_STYLE: BankStyle = {
  name: "Other Bank",
  badgeBg: "rgba(168, 85, 247, 0.15)",
  badgeBorder: "#a855f7",
  badgeText: "#c084fc",
  rowBg: "rgba(168, 85, 247, 0.06)",
  rowHoverBg: "rgba(168, 85, 247, 0.12)",
};

export function getBankStyle(bankName: string): BankStyle {
  return BANK_STYLES[bankName] || DEFAULT_BANK_STYLE;
}
