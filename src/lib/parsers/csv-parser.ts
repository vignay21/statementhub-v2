import Papa from "papaparse";
import { inferBank } from "./bank-detector";
import { findHeaderRow } from "./header-finder";
import { mapColumns } from "./column-mapper";
import { normalizeStatementRows } from "./normalizer";
import { ImportedStatement } from "@/types/statement";

export async function parseCSVStatement(file: File): Promise<ImportedStatement> {
  const text = await file.text();

  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(text, {
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawRows = results.data;
          if (!rawRows || rawRows.length === 0) {
            throw new Error(`File ${file.name} is empty.`);
          }

          const { headerIndex, headerRow, skippedRows } = findHeaderRow(rawRows);
          if (headerIndex === -1) {
            throw new Error(`Could not identify transaction table header in ${file.name}.`);
          }

          const columnMap = mapColumns(headerRow);

          // Collect sample narrations from the first 35 transactions to identify bank signatures
          const sampleDescriptions =
            columnMap.descCol >= 0
              ? rawRows
                  .slice(headerIndex + 1, headerIndex + 35)
                  .map((r) => String(r[columnMap.descCol] || ""))
                  .filter(Boolean)
              : [];

          const topLines = rawRows.slice(0, Math.max(headerIndex + 1, 15)).map((r) => r.join(" "));
          const bank = inferBank(file.name, topLines, sampleDescriptions);

          const transactions = await normalizeStatementRows(
            rawRows,
            columnMap,
            bank,
            file.name,
            headerIndex + 1
          );

          resolve({
            filename: file.name,
            bank,
            transactions,
            original_columns: headerRow,
            skipped_rows: skippedRows,
          });
        } catch (err) {
          reject(err);
        }
      },
      error: (err: any) => reject(err),
    });
  });
}
