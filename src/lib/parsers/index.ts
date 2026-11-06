import { ImportedStatement, StatementParseResult } from "@/types/statement";
import { parseCSVStatement } from "./csv-parser";
import { parseExcelStatement } from "./excel-parser";
import { parseJSONStatement } from "./json-parser";

export async function parseStatementFile(file: File): Promise<ImportedStatement> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return await parseCSVStatement(file);
  } else if (ext === "xls" || ext === "xlsx") {
    return await parseExcelStatement(file);
  } else if (ext === "json") {
    return await parseJSONStatement(file);
  } else if (ext === "pdf") {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/parsers/pdf", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `Failed to extract transactions from PDF ${file.name}`);
    }
    return {
      filename: file.name,
      bank: data.transactions?.[0]?.bank || "PDF Statement",
      transactions: data.transactions || [],
      original_columns: ["date", "description", "amount", "type", "utr", "bank"],
      skipped_rows: 0,
    };
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
