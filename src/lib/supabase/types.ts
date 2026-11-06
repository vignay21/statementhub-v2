export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: number;
          fingerprint: string;
          bank: string;
          date: string;
          description: string;
          party_name: string;
          amount: number;
          type: string;
          utr: string;
          balance: number | null;
          party_match_key: string;
          source_file: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          fingerprint: string;
          bank: string;
          date: string;
          description: string;
          party_name?: string;
          amount: number;
          type: string;
          utr?: string;
          balance?: number | null;
          party_match_key: string;
          source_file?: string;
          created_at?: string;
        };
        Update: Partial<{
          fingerprint: string;
          bank: string;
          date: string;
          description: string;
          party_name: string;
          amount: number;
          type: string;
          utr: string;
          balance: number | null;
          party_match_key: string;
          source_file: string;
        }>;
      };
      party_mappings: {
        Row: {
          match_key: string;
          party_name: string;
          updated_at: string;
        };
        Insert: {
          match_key: string;
          party_name: string;
          updated_at?: string;
        };
        Update: {
          party_name?: string;
          updated_at?: string;
        };
      };
      party_names: {
        Row: {
          name: string;
        };
        Insert: {
          name: string;
        };
      };
    };
  };
}
