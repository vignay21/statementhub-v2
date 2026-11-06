import { Transaction } from "./transaction";

export interface ImportedStatement {
  filename: string;
  bank: string;
  transactions: Transaction[];
  original_columns: string[];
  skipped_rows: number;
}

export interface StatementParseResult {
  statements: ImportedStatement[];
  totalTransactions: number;
  errors: string[];
}
