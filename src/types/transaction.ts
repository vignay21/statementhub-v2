export interface Transaction {
  id?: number;
  fingerprint: string;
  bank: string;
  date: string; // DD-MM-YYYY
  description: string;
  party_name: string;
  amount: number;
  type: "Credit" | "Debit";
  utr: string;
  balance?: number | null;
  party_match_key: string;
  source_file: string;
  created_at?: string;
  // Computed client-side flags:
  is_self_transfer?: boolean;
  is_fd_investment?: boolean;
  is_insurance_claim?: boolean;
  is_duplicate_utr?: boolean;
}

export interface PartyMapping {
  match_key: string;
  party_name: string;
  updated_at?: string;
}
