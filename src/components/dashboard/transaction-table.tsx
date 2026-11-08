"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  autoEditFingerprint?: string | null;
}

export function TransactionTable({
  transactions,
  onUpdatePartyName,
  storedParties = [],
  autoEditFingerprint,
}: TransactionTableProps) {
  const [editingFingerprint, setEditingFingerprint] = useState<string | null>(null);
  const [partyInput, setPartyInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(-1);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // B4 fix: Reset page to 1 whenever the transaction list changes
  useEffect(() => {
    setPage(1);
  }, [transactions]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const updateDropdownPosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const preferredHeight = 220;

    // Flip upwards if insufficient vertical room below (less than 180px) and more room above
    if (spaceBelow < 180 && spaceAbove > spaceBelow) {
      setDropdownCoords({
        bottom: window.innerHeight - rect.top + 4,
        left: Math.max(8, rect.left),
        width: Math.max(rect.width + 60, 260),
        maxHeight: Math.min(preferredHeight, Math.max(120, spaceAbove - 24)),
      });
    } else {
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, rect.left),
        width: Math.max(rect.width + 60, 260),
        maxHeight: Math.min(preferredHeight, Math.max(120, spaceBelow - 24)),
      });
    }
  };

  useEffect(() => {
    if (editingFingerprint && showSuggestions) {
      const timer = setTimeout(updateDropdownPosition, 20);
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("scroll", updateDropdownPosition, true);
        window.removeEventListener("resize", updateDropdownPosition);
      };
    }
  }, [editingFingerprint, showSuggestions, partyInput]);

  useEffect(() => {
    if (suggestIndex >= 0) {
      const el = document.getElementById(`party-suggestion-${suggestIndex}`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [suggestIndex]);

  // Suggest ONLY from stored authorized party names directory
  const allSuggestions = useMemo(() => {
    return storedParties
      .filter((p) => p && typeof p === "string" && p.trim())
      .sort((a, b) => a.localeCompare(b));
  }, [storedParties]);

  // Active suggestions matching the user's typed input
  const activeSuggestions = useMemo(() => {
    if (!editingFingerprint) return [];
    const q = partyInput.trim().toLowerCase();

    if (!q) {
      return allSuggestions.slice(0, 10);
    }

    return allSuggestions
      .filter((p) => p.toLowerCase().includes(q))
      .slice(0, 10);
  }, [editingFingerprint, partyInput, allSuggestions]);

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
    setTimeout(() => {
      updateDropdownPosition();
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  // Automatically initiate editing and focus party input if autoEditFingerprint is provided
  useEffect(() => {
    if (autoEditFingerprint) {
      const target = transactions.find((t) => t.fingerprint === autoEditFingerprint);
      if (target) {
        startEditing(target);
      }
    }
  }, [autoEditFingerprint, transactions]);

  const saveEditing = async (t: Transaction, overrideValue?: string) => {
    if (editingFingerprint) {
      const finalParty = (overrideValue !== undefined ? overrideValue : partyInput).trim();
      // Dismiss editing UI immediately so the user experiences instant response (0ms)
      setEditingFingerprint(null);
      setShowSuggestions(false);
      setSuggestIndex(-1);

      // Trigger optimistic persistence in background
      await onUpdatePartyName(t.fingerprint, t.party_match_key, finalParty);
    }
  };

  const exportToExcel = () => {
    if (transactions.length === 0) return;

    const rows = transactions.map((t) => ({
      Bank: t.bank,
      Date: t.date,
      Description: t.description,
      "Assigned Business / Party Name": t.party_name,
      Amount: t.amount,
      Type: t.type,
      "UTR / Reference": t.utr,
      "Closing Balance": t.balance ?? "",
      "Duplicate UTR": t.is_duplicate_utr ? "Yes" : "No",
      "Self Transfer": t.is_self_transfer ? "Yes" : "No",
      "Fixed Deposit": t.is_fd_investment ? "Yes" : "No",
      "Insurance Claim": t.is_insurance_claim ? "Yes" : "No",
      "Party Match Key": t.party_match_key,
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

                      {/* Party Name (Inline editable with auto-suggestions from stored directory) */}
                      <td className="py-2 px-3 whitespace-nowrap min-w-[200px] max-w-[280px]">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              ref={inputRef}
                              type="text"
                              value={partyInput}
                              onChange={(e) => {
                                setPartyInput(e.target.value);
                                setShowSuggestions(true);
                                setSuggestIndex(-1);
                                updateDropdownPosition();
                              }}
                              onFocus={() => {
                                setShowSuggestions(true);
                                updateDropdownPosition();
                              }}
                              onBlur={() => {
                                // Small delay allows click on suggestion item to register before hiding
                                setTimeout(() => setShowSuggestions(false), 200);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  setShowSuggestions(true);
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
                              className="px-2 py-1 rounded bg-slate-900 border border-indigo-500 text-xs text-white focus:outline-none w-full uppercase"
                              placeholder="Type or pick party name..."
                            />
                            <button
                              onClick={() => saveEditing(t)}
                              className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[11px] hover:bg-indigo-700 font-medium shrink-0"
                            >
                              Save
                            </button>
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
                              {t.party_name || "[Unassigned]"}
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

                      {/* Tags (Contra / FD / Duplicate UTR) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap w-[110px] space-x-1">
                        {t.is_duplicate_utr && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-400 border-amber-500/30">
                            Dup UTR
                          </Badge>
                        )}
                        {t.is_self_transfer && (
                          <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                            Contra
                          </Badge>
                        )}
                        {t.is_fd_investment && (
                          <Badge variant="default" className="text-[10px] py-0 px-1.5">
                            {t.type === "Credit" ? "FD Return" : "FD/Invest"}
                          </Badge>
                        )}
                        {t.is_insurance_claim && (
                          <Badge className="text-[10px] py-0 px-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Insurance
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

      {/* Floating suggestions portal - rendered at body root to avoid table overflow clipping */}
      {typeof document !== "undefined" &&
        showSuggestions &&
        activeSuggestions.length > 0 &&
        dropdownCoords &&
        editingFingerprint &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: dropdownCoords.top !== undefined ? `${dropdownCoords.top}px` : undefined,
              bottom: dropdownCoords.bottom !== undefined ? `${dropdownCoords.bottom}px` : undefined,
              left: `${dropdownCoords.left}px`,
              width: `${dropdownCoords.width}px`,
              maxHeight: `${dropdownCoords.maxHeight}px`,
            }}
            className="z-[99999] overflow-y-auto rounded-lg border border-indigo-500/80 bg-slate-900 shadow-2xl py-1 text-xs ring-1 ring-black/50"
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-indigo-400 tracking-wider border-b border-slate-800 mb-0.5 flex justify-between items-center bg-slate-950/70">
              <span>Suggested Parties ({activeSuggestions.length})</span>
              <span className="text-[9px] text-slate-500 lowercase">↑↓ navigate • enter select</span>
            </div>
            {activeSuggestions.map((s, idx) => (
              <button
                key={s}
                id={`party-suggestion-${idx}`}
                type="button"
                onClick={() => {
                  setPartyInput(s);
                  const activeTx = transactions.find((x) => x.fingerprint === editingFingerprint);
                  if (activeTx) {
                    saveEditing(activeTx, s);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 text-xs truncate transition-colors flex items-center justify-between ${
                  idx === suggestIndex
                    ? "bg-indigo-600 text-white font-medium"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span className="truncate">{s}</span>
                {idx === suggestIndex && (
                  <span className="text-[10px] opacity-80 shrink-0 ml-2">↵</span>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
