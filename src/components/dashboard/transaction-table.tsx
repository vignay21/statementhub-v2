"use client";

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, Copy, Check, Edit2, ArrowDownLeft, ArrowUpRight, ShieldCheck, Landmark, Sparkles } from "lucide-react";
import { Transaction } from "@/types/transaction";
import { formatINR } from "@/lib/formatters/currency";
import { getBankStyle } from "@/lib/constants";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface TransactionTableProps {
  transactions: Transaction[];
  onUpdatePartyName: (fingerprint: string, matchKey: string, newParty: string) => Promise<void>;
  storedParties?: string[];
}

export function TransactionTable({
  transactions,
  onUpdatePartyName,
  storedParties = [],
}: TransactionTableProps) {
  const [editingFingerprint, setEditingFingerprint] = useState<string | null>(null);
  const [partyInput, setPartyInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(-1);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Master suggestion pool combining stored directory, assigned parties, and detected match keys
  const allSuggestions = useMemo(() => {
    const set = new Set<string>();
    storedParties.forEach((p) => {
      if (p && p.trim()) set.add(p.trim());
    });
    transactions.forEach((tx) => {
      if (tx.party_name && tx.party_name.trim()) set.add(tx.party_name.trim());
      if (tx.party_match_key && tx.party_match_key.trim()) set.add(tx.party_match_key.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [storedParties, transactions]);

  // Active suggestions for the currently edited transaction
  const activeSuggestions = useMemo(() => {
    if (!editingFingerprint) return [];
    const q = partyInput.trim().toLowerCase();
    const currentTx = transactions.find((x) => x.fingerprint === editingFingerprint);
    const detectedKey = currentTx?.party_match_key?.trim();

    if (!q) {
      const initial: string[] = [];
      if (detectedKey) initial.push(detectedKey);
      for (const p of allSuggestions) {
        if (p !== detectedKey && initial.length < 8) {
          initial.push(p);
        }
      }
      return initial;
    }

    return allSuggestions
      .filter((p) => p.toLowerCase().includes(q))
      .slice(0, 8);
  }, [editingFingerprint, partyInput, allSuggestions, transactions]);

  const totalPages = Math.ceil(transactions.length / pageSize) || 1;
  const paginatedData = transactions.slice((page - 1) * pageSize, page * pageSize);

  const handleCopyUTR = (utr: string) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 1500);
  };

  const startEditing = (t: Transaction) => {
    setEditingFingerprint(t.fingerprint);
    setPartyInput(t.party_name || "");
    setShowSuggestions(true);
    setSuggestIndex(-1);
  };

  const saveEditing = async (t: Transaction, overrideValue?: string) => {
    if (editingFingerprint) {
      const finalParty = (overrideValue !== undefined ? overrideValue : partyInput).trim();
      await onUpdatePartyName(t.fingerprint, t.party_match_key, finalParty);
      setEditingFingerprint(null);
      setShowSuggestions(false);
      setSuggestIndex(-1);
    }
  };

  const exportToExcel = () => {
    if (transactions.length === 0) return;

    const rows = transactions.map((t) => ({
      Bank: t.bank,
      Date: t.date,
      Description: t.description,
      "Party Name": t.party_name,
      Amount: t.amount,
      Type: t.type,
      "UTR / Reference": t.utr,
      "Closing Balance": t.balance ?? "",
      "Self Transfer": t.is_self_transfer ? "Yes" : "No",
      "Fixed Deposit": t.is_fd_investment ? "Yes" : "No",
      "Source File": t.source_file,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Search Results");
    XLSX.writeFile(workbook, "unified-search-results.xlsx");
  };

  return (
    <div className="space-y-3">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div>
          Showing{" "}
          <span className="font-semibold text-slate-200">
            {transactions.length === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-slate-200">
            {Math.min(page * pageSize, transactions.length)}
          </span>{" "}
          of <span className="font-semibold text-slate-200">{transactions.length}</span> transactions
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={transactions.length === 0}
            className="h-8 gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download displayed results as Excel</span>
          </Button>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3 whitespace-nowrap w-[110px]">Bank</th>
                <th className="py-3 px-3 whitespace-nowrap w-[95px]">Date</th>
                <th className="py-3 px-3 min-w-[220px] max-w-[380px]">Description</th>
                <th className="py-3 px-3 min-w-[150px] max-w-[220px]">Party Name (Editable)</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-[120px]">Amount</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-[85px]">Type</th>
                <th className="py-3 px-3 whitespace-nowrap w-[170px]">UTR / Reference</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-[115px]">Balance</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-[90px]">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((t) => {
                  const bankStyle = getBankStyle(t.bank);
                  const isEditing = editingFingerprint === t.fingerprint;
                  const isCredit = t.type === "Credit";

                  return (
                    <tr
                      key={t.fingerprint}
                      style={{ backgroundColor: bankStyle.rowBg }}
                      className="transition-colors hover:brightness-110"
                    >
                      {/* Bank badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap w-[110px]">
                        <span
                          style={{
                            backgroundColor: bankStyle.badgeBg,
                            borderColor: bankStyle.badgeBorder,
                            color: bankStyle.badgeText,
                          }}
                          className="px-2 py-0.5 rounded border text-[11px] font-medium"
                        >
                          {t.bank}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-300 w-[95px]">
                        {t.date}
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-3 text-slate-200 min-w-[220px] max-w-[380px] break-words text-[11px] leading-relaxed">
                        {t.description}
                      </td>

                      {/* Party Name (Inline editable with rich auto-suggestions) */}
                      <td className="py-2 px-3 whitespace-nowrap min-w-[200px] max-w-[280px]">
                        {isEditing ? (
                          <div className="relative w-full space-y-1">
                            {/* Detected counterparty quick chip */}
                            {t.party_match_key && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="text-slate-500">Detected:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPartyInput(t.party_match_key);
                                    saveEditing(t, t.party_match_key);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 hover:bg-indigo-900 border border-indigo-800 font-mono text-[9px] transition-colors truncate max-w-[170px]"
                                  title="Click to apply detected name"
                                >
                                  + {t.party_match_key}
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={partyInput}
                                list="global-party-datalist"
                                onChange={(e) => {
                                  setPartyInput(e.target.value);
                                  setShowSuggestions(true);
                                  setSuggestIndex(-1);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setSuggestIndex((prev) =>
                                      Math.min(prev + 1, activeSuggestions.length - 1)
                                    );
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    setSuggestIndex((prev) => Math.max(prev - 1, -1));
                                  } else if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (suggestIndex >= 0 && activeSuggestions[suggestIndex]) {
                                      setPartyInput(activeSuggestions[suggestIndex]);
                                      saveEditing(t, activeSuggestions[suggestIndex]);
                                    } else {
                                      saveEditing(t);
                                    }
                                  } else if (e.key === "Escape") {
                                    setEditingFingerprint(null);
                                    setShowSuggestions(false);
                                  }
                                }}
                                autoFocus
                                className="px-2 py-1 rounded bg-slate-900 border border-indigo-500 text-xs text-white focus:outline-none w-full"
                                placeholder="Type or pick party name..."
                              />
                              <button
                                onClick={() => saveEditing(t)}
                                className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[11px] hover:bg-indigo-700 font-medium shrink-0"
                              >
                                Save
                              </button>
                            </div>

                            {/* Floating suggestion dropdown */}
                            {showSuggestions && activeSuggestions.length > 0 && (
                              <div
                                className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-700 bg-slate-900 shadow-2xl py-1"
                                onMouseDown={(e) => e.preventDefault()}
                              >
                                {activeSuggestions.map((s, idx) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                      setPartyInput(s);
                                      saveEditing(t, s);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 text-xs truncate transition-colors flex items-center justify-between ${
                                      idx === suggestIndex
                                        ? "bg-indigo-600 text-white"
                                        : "text-slate-200 hover:bg-slate-800"
                                    }`}
                                  >
                                    <span className="truncate">{s}</span>
                                    {s === t.party_match_key && (
                                      <span className="text-[9px] ml-1 text-indigo-300 font-mono shrink-0">
                                        Detected
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => startEditing(t)}
                            className="group flex items-center justify-between gap-1 px-2 py-1 rounded hover:bg-slate-800/80 cursor-pointer text-slate-200"
                            title="Click to edit party name"
                          >
                            <span
                              className={`truncate ${
                                t.party_name
                                  ? "font-medium text-slate-100"
                                  : "text-slate-500 italic"
                              }`}
                            >
                              {t.party_name || (t.party_match_key ? `[${t.party_match_key}]` : "[Unassigned]")}
                            </span>
                            <Edit2 className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap w-[120px] ${
                          isCredit ? "text-emerald-400" : "text-slate-100"
                        }`}
                      >
                        {formatINR(t.amount)}
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap w-[85px]">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                            isCredit
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          <span>{t.type}</span>
                        </span>
                      </td>

                      {/* UTR / Reference */}
                      <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap w-[170px]">
                        {t.utr ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="truncate max-w-[130px]" title={t.utr}>{t.utr}</span>
                            <button
                              onClick={() => handleCopyUTR(t.utr)}
                              className="text-slate-500 hover:text-slate-200 p-0.5 transition-colors shrink-0"
                              title="Copy UTR"
                            >
                              {copiedUtr === t.utr ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Balance */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400 whitespace-nowrap w-[115px]">
                        {t.balance !== null && t.balance !== undefined
                          ? formatINR(t.balance, "₹ ")
                          : "-"}
                      </td>

                      {/* Tags (Contra / FD) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap w-[90px] space-x-1">
                        {t.is_self_transfer && (
                          <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                            Contra
                          </Badge>
                        )}
                        {t.is_fd_investment && (
                          <Badge variant="default" className="text-[10px] py-0 px-1.5">
                            FD/Invest
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page <span className="font-semibold text-slate-200">{page}</span> of{" "}
              <span className="font-semibold text-slate-200">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-3 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 px-3 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Global Datalist for Native Autocomplete Fallback */}
      <datalist id="global-party-datalist">
        {allSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
