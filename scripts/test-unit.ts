import assert from "node:assert/strict";

import { normalizeDate } from "@/lib/formatters/date";
import { detectContraTransfers } from "@/lib/business/contra-detector";
import { cleanUTR, cleanTransactionUTR } from "@/lib/business/utr-refiner";
import { deduplicateTransactions } from "@/lib/business/deduplication";
import { matchesHeaderAlias, mapColumns } from "@/lib/parsers/column-mapper";
import { findHeaderRow } from "@/lib/parsers/header-finder";
import { normalizeStatementRows } from "@/lib/parsers/normalizer";
import { inferBank } from "@/lib/parsers/bank-detector";
import { isAccessCodeValid, hashAccessCode, isValidSessionToken } from "@/lib/auth";
import { filterAndSortModelObjects } from "@/lib/ai/gemini-models";
import { getGeminiClient } from "@/lib/ai/gemini-client";
import { extractPartyMatchKey } from "@/lib/business/party-match-key";
import { resolvePartyName } from "@/lib/business/party-resolver";
import { Transaction } from "@/types/transaction";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function asyncTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runAll() {
  console.log("\n=======================================================");
  console.log("  StatementHub v2 — Automated Unit & Integration Suite");
  console.log("=======================================================\n");

  // 1. Date Normalizer Tests (B3)
  console.log("--- 1. Date Normalizer (B3) ---");
  test("Parses standard Indian DD-MM-YYYY format", () => {
    assert.equal(normalizeDate("15-08-2024"), "15-08-2024");
    assert.equal(normalizeDate("05/11/2023"), "05-11-2023");
    assert.equal(normalizeDate("2.3.2024"), "02-03-2024");
  });

  test("Parses ISO format YYYY-MM-DD to DD-MM-YYYY", () => {
    assert.equal(normalizeDate("2024-03-15"), "15-03-2024");
  });

  test("Parses Date objects", () => {
    const d = new Date(2024, 0, 9); // Jan 9 2024
    assert.equal(normalizeDate(d), "09-01-2024");
  });

  test("B3 Fix: Returns empty string '' on unparseable date strings instead of raw string", () => {
    assert.equal(normalizeDate("Opening Balance"), "");
    assert.equal(normalizeDate("Apr 25"), "");
    assert.equal(normalizeDate("invalid_text"), "");
    assert.equal(normalizeDate(""), "");
    assert.equal(normalizeDate(null), "");
    assert.equal(normalizeDate(undefined), "");
  });

  // 2. Contra Detector Tests (B2)
  console.log("\n--- 2. Contra Detector (B2) ---");
  test("B2 Fix: Single-bank reversal pair with same UTR is NOT flagged as cross-bank contra", () => {
    const txns: Transaction[] = [
      {
        fingerprint: "tx1",
        bank: "HDFC Bank",
        date: "01-04-2024",
        description: "REVERSAL OF PAYMENT",
        party_name: "Customer A",
        amount: 5000,
        type: "Credit",
        utr: "UTR99999",
        balance: 10000,
        party_match_key: "",
        source_file: "hdfc.csv",
      },
      {
        fingerprint: "tx2",
        bank: "HDFC Bank",
        date: "01-04-2024",
        description: "PAYMENT TO VENDOR",
        party_name: "Customer A",
        amount: 5000,
        type: "Debit",
        utr: "UTR99999",
        balance: 5000,
        party_match_key: "",
        source_file: "hdfc.csv",
      },
    ];
    const flags = detectContraTransfers(txns);
    assert.equal(flags[0], false, "Single-bank reversal credit should not be flagged as contra");
    assert.equal(flags[1], false, "Single-bank reversal debit should not be flagged as contra");
  });

  test("Flags cross-bank transfer between two different banks with same UTR as contra", () => {
    const txns: Transaction[] = [
      {
        fingerprint: "tx1",
        bank: "HDFC Bank",
        date: "02-04-2024",
        description: "TRANSFER TO ICICI",
        party_name: "Self",
        amount: 25000,
        type: "Debit",
        utr: "CMS88888888",
        balance: 50000,
        party_match_key: "",
        source_file: "hdfc.csv",
      },
      {
        fingerprint: "tx2",
        bank: "ICICI Bank",
        date: "02-04-2024",
        description: "FUNDS FROM HDFC",
        party_name: "Self",
        amount: 25000,
        type: "Credit",
        utr: "CMS88888888",
        balance: 75000,
        party_match_key: "",
        source_file: "icici.csv",
      },
    ];
    const flags = detectContraTransfers(txns);
    assert.equal(flags[0], true, "HDFC debit in cross-bank transfer must be flagged as contra");
    assert.equal(flags[1], true, "ICICI credit in cross-bank transfer must be flagged as contra");
  });

  test("Flags transactions with self-transfer keywords in party name or narration", () => {
    const txns: Transaction[] = [
      {
        fingerprint: "tx1",
        bank: "SBI",
        date: "03-04-2024",
        description: "Transfer to own a/c 1234",
        party_name: "",
        amount: 10000,
        type: "Debit",
        utr: "",
        balance: null,
        party_match_key: "",
        source_file: "sbi.csv",
      },
    ];
    const flags = detectContraTransfers(txns);
    assert.equal(flags[0], true);
  });

  // 3. UTR Refiner & Cleaner Tests (B7, B10, A2)
  console.log("\n--- 3. UTR Refiner & Cleaner (B7, B10, A2) ---");
  test("Cleans UTR when polluted by an IFSC code", () => {
    const narration = "UPI/412345678901/PAY TO MERCHANT/HDFC0000123/DIRECT";
    const ifscUtr = "HDFC0000123";
    const cleaned = cleanUTR(narration, ifscUtr);
    assert.equal(cleaned, "412345678901", "Should extract real UPI reference instead of IFSC code");
  });

  test("Preserves valid non-IFSC UTR untouched", () => {
    const narration = "NEFT CR-HDFCN0012345678-ACME CORP";
    const validUtr = "HDFCN0012345678";
    const cleaned = cleanUTR(narration, validUtr);
    assert.equal(cleaned, "HDFCN0012345678");
  });

  test("cleanTransactionUTR immutably cleans transaction UTR", () => {
    const t: Transaction = {
      fingerprint: "abc",
      bank: "HDFC",
      date: "01-01-2024",
      amount: 100,
      type: "Debit",
      description: "UPI/399999999999/TRANSFER/SBIN0001234",
      utr: "SBIN0001234",
      party_name: "",
      party_match_key: "",
      source_file: "",
    };
    const updated = cleanTransactionUTR(t);
    assert.equal(updated.utr, "399999999999");
    assert.equal(t.utr, "SBIN0001234", "Original transaction must remain immutable");
  });

  // 4. Deduplication Engine Tests (B5)
  console.log("\n--- 4. Deduplication Engine (B5) ---");
  test("Layer 1: Identifies exact fingerprint duplicate", () => {
    const existing: Transaction[] = [
      {
        fingerprint: "fp_12345",
        bank: "HDFC",
        date: "01-04-2024",
        amount: 1000,
        type: "Debit",
        utr: "UTR1",
        balance: 5000,
        description: "",
        party_name: "",
        party_match_key: "",
        source_file: "",
      },
    ];
    const incoming: Transaction[] = [
      {
        fingerprint: "fp_12345",
        bank: "HDFC",
        date: "01-04-2024",
        amount: 1000,
        type: "Debit",
        utr: "UTR1",
        balance: 5000,
        description: "",
        party_name: "",
        party_match_key: "",
        source_file: "",
      },
    ];
    const res = deduplicateTransactions(incoming, existing);
    assert.equal(res.duplicateCount, 1);
    assert.equal(res.newTransactions.length, 0);
  });

  test("B5 Fix: Distinct transactions on same day with different UTRs and same balance are NOT dropped", () => {
    const existing: Transaction[] = [
      {
        fingerprint: "fp_1",
        bank: "HDFC",
        date: "01-04-2024",
        amount: 500,
        type: "Debit",
        utr: "UTR_AAA",
        balance: 10000,
        description: "Payment to Vendor A",
        party_name: "",
        party_match_key: "",
        source_file: "",
      },
    ];
    const incoming: Transaction[] = [
      {
        fingerprint: "fp_2",
        bank: "HDFC",
        date: "01-04-2024",
        amount: 500,
        type: "Debit",
        utr: "UTR_BBB", // Different distinct UTR!
        balance: 10000, // Coincidentally same balance
        description: "Payment to Vendor B",
        party_name: "",
        party_match_key: "",
        source_file: "",
      },
    ];
    const res = deduplicateTransactions(incoming, existing);
    assert.equal(res.duplicateCount, 0, "Distinct transaction with different UTR must NOT be dropped");
    assert.equal(res.newTransactions.length, 1);
    assert.equal(res.newTransactions[0].fingerprint, "fp_2");
  });

  test("Balance fallback dedup only fires when UTR is missing", () => {
    const existing: Transaction[] = [
      {
        fingerprint: "fp_1",
        bank: "HDFC",
        date: "01-04-2024",
        amount: 500,
        type: "Debit",
        utr: "",
        balance: 10000,
        description: "Cash withdrawal",
        party_name: "",
        party_match_key: "",
        source_file: "",
      },
    ];
    const incoming: Transaction[] = [
      {
        fingerprint: "fp_different_hash",
        bank: "HDFC",
        date: "01-04-2024",
        amount: 500,
        type: "Debit",
        utr: "",
        balance: 10000,
        description: "Cash withdrawal re-imported",
        party_name: "",
        party_match_key: "",
        source_file: "",
      },
    ];
    const res = deduplicateTransactions(incoming, existing);
    assert.equal(res.duplicateCount, 1, "Duplicate without UTR should be detected via balance key");
  });

  test("Layer 3: Identifies duplicate transaction when UTR differed across parser runs (e.g. IFSC code vs genuine UTR)", () => {
    const existing: Transaction[] = [
      {
        fingerprint: "fp_old_hash_with_ifsc",
        bank: "HDFC Bank",
        date: "01-11-2026",
        amount: 111000,
        type: "Debit",
        utr: "KKBK0007679", // Accidental IFSC captured by older parser
        balance: 1712291.45,
        description: "NEFT DR-KKBK0007679-KOMAKULA RAJENDER-SANDOZ - MUM-HDFCH01369258403-NET BANKING SI -HOMELOANEMI",
        party_name: "HOME LOAN EMI",
        party_match_key: "",
        source_file: "old_statement.xls",
      },
    ];
    const incoming: Transaction[] = [
      {
        fingerprint: "fp_new_hash_with_refined_utr",
        bank: "HDFC Bank",
        date: "01-11-2026",
        amount: 111000,
        type: "Debit",
        utr: "HDFCH01369258403", // Refined genuine UTR
        balance: 1712291.45,
        description: "NEFT DR-KKBK0007679-KOMAKULA RAJENDER-SANDOZ - MUM-HDFCH01369258403-NET BANKING SI -HOMELOANEMI",
        party_name: "",
        party_match_key: "",
        source_file: "new_statement.xls",
      },
    ];
    const res = deduplicateTransactions(incoming, existing);
    assert.equal(res.duplicateCount, 1, "Must recognize duplicate statement row across parser upgrades");
    assert.equal(res.newTransactions.length, 0);
  });

  // 5. Header Finder & Column Mapper (Q10)
  console.log("\n--- 5. Header Finder & Column Mapper (Q10) ---");
  test("Q10 Fix: Word boundary check prevents 'date' from over-matching 'updated' or 'candidate'", () => {
    assert.equal(matchesHeaderAlias("candidate", "date"), false);
    assert.equal(matchesHeaderAlias("updated", "date"), false);
    assert.equal(matchesHeaderAlias("validated date", "date"), true);
    assert.equal(matchesHeaderAlias("date", "date"), true);
    assert.equal(matchesHeaderAlias("txn date", "date"), true);
  });

  test("Q10 Fix: Word boundary check prevents 'dr' from matching 'address' or 'withdraw'", () => {
    assert.equal(matchesHeaderAlias("address", "dr"), false);
    assert.equal(matchesHeaderAlias("withdraw", "dr"), false);
    assert.equal(matchesHeaderAlias("dr", "dr"), true);
    assert.equal(matchesHeaderAlias("dr amount", "dr"), true);
    assert.equal(matchesHeaderAlias("amount (dr)", "dr"), true);
  });

  test("mapColumns correctly maps typical bank statement headers", () => {
    const headers = ["Txn Date", "Narration", "Chq/Ref No.", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"];
    const map = mapColumns(headers);
    assert.equal(map.dateCol, 0);
    assert.equal(map.descCol, 1);
    assert.equal(map.refCol, 2);
    assert.equal(map.debitCol, 3);
    assert.equal(map.creditCol, 4);
    assert.equal(map.balanceCol, 5);
  });

  test("mapColumns & normalizer correctly handle ICICI single Amount + Cr/Dr format", async () => {
    const headers = [
      "No.",
      "Transaction ID",
      "Value Date",
      "Txn Posted Date",
      "ChequeNo.",
      "Description",
      "Cr/Dr",
      "Transaction Amount(INR)",
      "Available Balance(INR)"
    ];
    const map = mapColumns(headers);
    assert.equal(map.dateCol, 2);
    assert.equal(map.descCol, 5);
    assert.equal(map.refCol, 1);
    assert.equal(map.typeCol, 6, "Cr/Dr column must be identified as typeCol");
    assert.equal(map.amountCol, 7, "Transaction Amount(INR) must be identified as amountCol");
    assert.equal(map.balanceCol, 8);
    assert.equal(map.debitCol, -1, "Cr/Dr must NOT be falsely identified as debitCol");

    const sampleRows = [
      headers,
      ["1.0", "S89662450", "01/11/2026", "01/11/2026 09:09:23 AM", "-", "UPI/THOTA LAXM/Payment", "CR", "4621.0", "187213.32"],
      ["23.0", "S14391552", "03/11/2026", "03/11/2026 12:33:31 PM", "-", "MMT/IMPS/630712378713/Transfer", "DR", "425818.0", "100000.32"]
    ];

    const txns = await normalizeStatementRows(sampleRows, map, "ICICI Bank", "test.xlsx", 1);
    assert.equal(txns.length, 2);
    assert.equal(txns[0].amount, 4621);
    assert.equal(txns[0].type, "Credit");
    assert.equal(txns[1].amount, 425818);
    assert.equal(txns[1].type, "Debit");

    const bank = inferBank("DetailedStatement_749205003098.xlsx", [
      "DETAILED STATEMENT",
      "Transactions List -   -LAKSHMI DEVI AGENCIES (INR) - 749205003098"
    ], ["MMT/IMPS/630712378713/LAKSHMIDEVIAGEN/CNRB0006850"]);
    assert.equal(bank, "ICICI Bank");
  });

  test("findHeaderRow identifies header row when prefixed with metadata rows", () => {
    const rows = [
      ["HDFC BANK STATEMENT", "", ""],
      ["Account Number: 1234567890", "", ""],
      ["Statement Period: 01-04-2024 to 30-04-2024", "", ""],
      ["", "", ""],
      ["Date", "Narration", "Chq / Ref No", "Withdrawal", "Deposit", "Balance"],
      ["01-04-2024", "Opening Balance", "", "0.00", "0.00", "50000.00"],
      ["02-04-2024", "UPI/123456/Shop", "123456", "250.00", "0.00", "49750.00"],
    ];
    const result = findHeaderRow(rows);
    assert.equal(result.headerIndex, 4, "Should detect row 4 as the header row");
    assert.equal(result.headerRow[0], "Date");
  });

  // 6. Auth Tests (S4, Q9)
  console.log("\n--- 6. Auth Verification (S4, Q9) ---");
  test("Q9 Fix: isAccessCodeValid is synchronous and validates against configured codes", () => {
    process.env.APP_ACCESS_CODE = "SecretPass123,AnotherCode";
    assert.equal(isAccessCodeValid("SecretPass123"), true);
    assert.equal(isAccessCodeValid("AnotherCode"), true);
    assert.equal(isAccessCodeValid("WrongPass"), false);
  });

  await asyncTest("S4 Fix: hashAccessCode and isValidSessionToken perform constant-time validation", async () => {
    process.env.APP_ACCESS_CODE = "TestKey999";
    const token = await hashAccessCode("TestKey999");
    assert.ok(token && token.length === 64, "Token should be 64-char SHA-256 hex string");

    const valid = await isValidSessionToken(token);
    assert.equal(valid, true, "Valid session token should return true");

    const invalid = await isValidSessionToken("0".repeat(64));
    assert.equal(invalid, false, "Invalid session token should return false");
  });

  // 7. Gemini Model Filtering (A3)
  console.log("\n--- 7. Gemini Model Filtering & Ordering (A3) ---");
  test("filterAndSortModelObjects filters unsupported models and sorts by preference", () => {
    const raw = [
      { name: "models/gemini-1.5-flash", supportedGenerationMethods: ["generateContent"] },
      { name: "models/gemini-2.0-flash", supportedGenerationMethods: ["generateContent"] },
      { name: "models/gemini-3.8-flash", displayName: "Gemini 3.8 Flash", supportedGenerationMethods: ["generateContent"] },
      { name: "models/gemini-flash-lite-latest", displayName: "Gemini Flash Lite Latest", supportedGenerationMethods: ["generateContent"] },
      { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
      { name: "models/gemini-tts", supportedGenerationMethods: ["generateContent"] },
    ];
    const filtered = filterAndSortModelObjects(raw);
    const ids = filtered.map((m) => m.id);
    assert.ok(!ids.includes("gemini-1.5-flash"), "Should exclude 1.5");
    assert.ok(!ids.includes("gemini-2.0-flash"), "Should exclude 2.0");
    assert.ok(!ids.includes("gemini-tts"), "Should exclude TTS");
    assert.ok(!ids.includes("text-embedding-004"), "Should exclude non-content generation");
    assert.equal(ids[0], "gemini-flash-lite-latest", "Should put flash-lite at top priority");
    assert.ok(ids.includes("gemini-3.8-flash"));
  });

  // 8. Gemini Client Singleton Isolation (B1)
  console.log("\n--- 8. Gemini Client Singleton Isolation (B1) ---");
  test("B1 Fix: Custom API key does not overwrite module singleton", () => {
    process.env.GEMINI_API_KEY = "env_default_key";
    const client1 = getGeminiClient();
    const customClient = getGeminiClient("custom_user_key");
    const client2 = getGeminiClient();

    assert.ok(client1 !== null);
    assert.ok(customClient !== null);
    assert.equal(client1, client2, "Subsequent default requests must reuse singleton");
    assert.notEqual(customClient, client1, "Custom key must return isolated instance");
  });

  // 9. Party Match Key & Auto Mapping (Cash Deposit & Narration Mapping)
  console.log("\n--- 9. Party Match Key & Auto Mapping (Cash Deposit & Narration Mapping) ---");
  test("Extracts clean match key for 'BY CASH -PARKAL SIKINDER' without hyphen truncation", () => {
    const key = extractPartyMatchKey("BY CASH -PARKAL SIKINDER");
    assert.equal(key, "BY CASH PARKAL SIKINDER");
  });

  test("resolvePartyName maps 'BY CASH -PARKAL SIKINDER' to 'CASH DEPOSIT'", () => {
    assert.equal(resolvePartyName("BY CASH -PARKAL SIKINDER"), "CASH DEPOSIT");
    assert.equal(resolvePartyName("PARKAL SIKINDER"), "CASH DEPOSIT");
    assert.equal(resolvePartyName("BY CASH DEP SIKINDER"), "CASH DEPOSIT");
    assert.equal(resolvePartyName("BY CASH"), "CASH DEPOSIT");
  });

  test("resolvePartyName matches against custom partyMappings dictionary", () => {
    const mappings = {
      "SRI SAI TRADERS": "SUPPLIER A",
      "BY CASH PARKAL SIKINDER": "CASH DEPOSIT",
    };
    assert.equal(resolvePartyName("UPI/CR/123/SRI SAI TRADERS", "SRI SAI TRADERS", mappings), "SUPPLIER A");
    assert.equal(resolvePartyName("BY CASH -PARKAL SIKINDER", "BY CASH PARKAL SIKINDER", mappings), "CASH DEPOSIT");
  });

  test("resolvePartyName maps Canara Bank Hanamkonda Home Loan CASA drawdown to 'HNK HOME LOAN EMI'", () => {
    const narration = "160003276880 -RAJENDER KOMAKULA Drawdown From CASA.";
    assert.equal(resolvePartyName(narration), "HNK HOME LOAN EMI");
  });

  console.log("\n=======================================================");
  console.log(`  Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
