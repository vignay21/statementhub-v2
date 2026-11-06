import { ImportedStatement, StatementParseResult } from "@/types/statement";
import { parseCSVStatement } from "./csv-parser";
import { parseExcelStatement } from "./excel-parser";

export async function parseStatementFile(file: File): Promise<ImportedStatement> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return await parseCSVStatement(file);
  } else if (ext === "xls" || ext === "xlsx") {
    return await parseExcelStatement(file);
  } else {
    throw new Error(`Unsupported file type .${ext} for file ${file.name}`);
  }
}

export async function parseMultipleStatements(files: File[]): Promise<StatementParseResult> {
  const statements: ImportedStatement[] = [];
  const errors: string[] = [];
  let totalTransactions = 0;

  for (const file of files) {
    try {
      const stmt = await parseStatementFile(file);
      statements.push(stmt);
      totalTransactions += stmt.transactions.length;
    } catch (err: any) {
      errors.push(`${file.name}: ${err.message || String(err)}`);
    }
  }

  return {
    statements,
    totalTransactions,
    errors,
  };
}
