import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { syncTransactionsWithDB } from "@/lib/supabase/transactions";
import { savePartyNameInDB, savePartyMappingInDB } from "@/lib/supabase/party-mappings";
import { computeFingerprint } from "@/lib/business/fingerprint";
import { normalizeDate } from "@/lib/formatters/date";
import { parseAmount } from "@/lib/parsers/amount-parser";
import { extractPartyMatchKey } from "@/lib/business/party-match-key";
import { Transaction } from "@/types/transaction";

export async function POST(req: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const backup = await req.json();
    if (!backup) {
      return NextResponse.json({ error: "Empty or invalid JSON payload received" }, { status: 400 });
    }

    let rawTransactions: any[] = [];
    let rawParties: any = null;
    let rawMappings: any = null;

    if (Array.isArray(backup)) {
      rawTransactions = backup;
    } else if (typeof backup === "object") {
      if (Array.isArray(backup.transactions)) {
        rawTransactions = backup.transactions;
      } else if (Array.isArray(backup.data)) {
        rawTransactions = backup.data;
      } else if (Array.isArray(backup.rows)) {
        rawTransactions = backup.rows;
      } else if (Array.isArray(backup.items)) {
        rawTransactions = backup.items;
      } else if (backup.transactions && typeof backup.transactions === "object") {
        rawTransactions = Object.values(backup.transactions);
      }

      rawParties =
        backup.stored_parties ||
        backup.storedParties ||
        backup.parties ||
        backup.party_names ||
        backup.partyNames;
      rawMappings =
        backup.party_mappings ||
        backup.partyMappings ||
        backup.mappings;
    }

    // 1. Safely restore stored parties (supports arrays or dictionary objects)
    const storedPartiesSet = new Set<string>();
    if (Array.isArray(rawParties)) {
      rawParties.forEach((p) => {
        const val = typeof p === "object" && p ? p.name || p.party_name || "" : String(p || "");
        if (val.trim()) storedPartiesSet.add(val.trim());
      });
    } else if (rawParties && typeof rawParties === "object") {
      Object.entries(rawParties).forEach(([k, v]) => {
        if (typeof v === "string" && v.trim() && isNaN(Number(v))) storedPartiesSet.add(v.trim());
        else if (k.trim() && isNaN(Number(k))) storedPartiesSet.add(k.trim());
      });
    }

    // 2. Safely restore party mappings (supports array of objects or dictionary key-value map)
    const partyMappings: { match_key: string; party_name: string }[] = [];
    if (Array.isArray(rawMappings)) {
      rawMappings.forEach((m) => {
        if (m && typeof m === "object" && m.match_key && m.party_name) {
          const name = String(m.party_name).trim();
          partyMappings.push({
            match_key: String(m.match_key).trim(),
            party_name: name,
          });
          if (name) storedPartiesSet.add(name);
        }
      });
    } else if (rawMappings && typeof rawMappings === "object") {
      Object.entries(rawMappings).forEach(([match_key, party_name]) => {
        if (match_key && party_name) {
          const name = String(party_name).trim();
          partyMappings.push({
            match_key: String(match_key).trim(),
            party_name: name,
          });
          if (name) storedPartiesSet.add(name);
        }
      });
    }

    // 3. Harvest any party_name from raw transactions
    if (Array.isArray(rawTransactions)) {
      rawTransactions.forEach((t) => {
        if (t && typeof t === "object") {
          const p = String(t.party_name || t.party || "").trim();
          if (p && p.length > 2) storedPartiesSet.add(p);
        }
      });
    }

    const storedParties = Array.from(storedPartiesSet);

    for (const name of storedParties) {
      try {
        await savePartyNameInDB(client, name);
      } catch (err) {
        console.warn("Failed to restore party name:", name, err);
      }
    }

    for (const mapping of partyMappings) {
      if (mapping.match_key && mapping.party_name) {
        try {
          await savePartyMappingInDB(client, mapping.match_key, mapping.party_name);
        } catch (err) {
          console.warn("Failed to restore mapping:", mapping, err);
        }
      }
    }

    // 3. Normalize and sanitize transactions
    const sanitizedTransactions: Transaction[] = [];
    for (const t of rawTransactions) {
      if (!t || typeof t !== "object") continue;

      const rawDate = t.date || t.Date || t.txn_date || t.transaction_date || "";
      const date = normalizeDate(rawDate);
      if (!date) continue; // Skip items without recognizable date

      const parsedAmt = parseAmount(t.amount !== undefined ? t.amount : (t.Amount || 0));
      const amount = parsedAmt.amount;

      let type: "Credit" | "Debit" = "Credit";
      if (t.type === "Debit" || t.type === "DR" || t.type === "dr") {
        type = "Debit";
      } else if (t.type === "Credit" || t.type === "CR" || t.type === "cr") {
        type = "Credit";
      } else if (parsedAmt.raw < 0) {
        type = "Debit";
      }

      const bank = String(t.bank || t.Bank || "Other Bank").trim();
      const description = String(t.description || t.Description || t.narration || t.particulars || "").trim();
      const utr = String(t.utr || t.UTR || t.ref || t.reference || t.ref_no || "").trim();
      const party_name = String(t.party_name || t.party || "").trim();
      const balance =
        t.balance !== undefined && t.balance !== null && !isNaN(Number(t.balance))
          ? Number(t.balance)
          : null;
      const party_match_key =
        String(t.party_match_key || "").trim() || extractPartyMatchKey(description);
      const source_file = String(t.source_file || "backup_import.json").trim();

      let fingerprint = String(t.fingerprint || "").trim();
      if (!fingerprint) {
        fingerprint = await computeFingerprint(bank, date, amount, type, utr, description, balance);
      }

      sanitizedTransactions.push({
        fingerprint,
        bank,
        date,
        description,
        party_name,
        amount,
        type,
        utr,
        balance,
        party_match_key,
        source_file,
      });
    }

    // 4. Restore transactions with deduplication
    const result = await syncTransactionsWithDB(client, sanitizedTransactions);

    return NextResponse.json({
      success: true,
      restoredParties: storedParties.length,
      restoredMappings: partyMappings.length,
      transactionsResult: result,
    });
  } catch (err: any) {
    console.error("API /backup/import error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process backup file" },
      { status: 500 }
    );
  }
}
