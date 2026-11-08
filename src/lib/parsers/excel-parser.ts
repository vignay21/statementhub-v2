import * as XLSX from "xlsx";
import { inferBank } from "./bank-detector";
import { findHeaderRow } from "./header-finder";
import { mapColumns } from "./column-mapper";
import { normalizeStatementRows } from "./normalizer";
import { ImportedStatement } from "@/types/statement";

export async function parseExcelStatement(file: File): Promise<ImportedStatement> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert worksheet to array of row arrays
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error(`Worksheet in ${file.name} is empty.`);
  }

  const { headerIndex, headerRow, skippedRows } = findHeaderRow(rawRows);
  if (headerIndex === -1) {
    throw new Error(`Could not identify transaction table header in ${file.name}.`);
  }

  const columnMap = mapColumns(headerRow);

  // Collect sample narrations from the first 30 transactions to identify bank signatures
  const sampleDescriptions =
    columnMap.descCol >= 0
      ? rawRows
          .slice(headerIndex + 1, headerIndex + 35)
          .map((r) => String(r[columnMap.descCol] || ""))
          .filter(Boolean)
      : [];

  // Cover rows & sheet names
  const topLines = [
    workbook.SheetNames.join(" "),
    ...rawRows.slice(0, Math.max(headerIndex + 1, 15)).map((r) => r.join(" ")),
  ];

  const bank = inferBank(file.name, topLines, sampleDescriptions);

  const transactions = await normalizeStatementRows(
    rawRows,
    columnMap,
    bank,
    file.name,
    headerIndex + 1
  );

  return {
    filename: file.name,
    bank,
    transactions,
    original_columns: headerRow,
    skipped_rows: skippedRows,
  };
}
