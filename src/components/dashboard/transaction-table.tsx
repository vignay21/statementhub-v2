"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Copy, Check, Edit2, ArrowDownLeft, ArrowUpRight, ShieldCheck, Landmark } from "lucide-react";
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
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

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
  };

  const saveEditing = async (t: Transaction) => {
    if (editingFingerprint) {
      await onUpdatePartyName(t.fingerprint, t.party_match_key, partyInput.trim());
      setEditingFingerprint(null);
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Bank</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3.5 min-w-[260px]">Description</th>
                <th className="py-3 px-3 min-w-[180px]">Party Name (Editable)</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Type</th>
                <th className="py-3 px-3 min-w-[150px]">UTR / Reference</th>
                <th className="py-3 px-3 text-right">Balance</th>
                <th className="py-3 px-3 text-center">Tags</th>
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
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
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
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-300">
                        {t.date}
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-3.5 text-slate-200 break-words leading-relaxed">
                        {t.description}
                      </td>

                      {/* Party Name (Inline editable) */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={partyInput}
                              onChange={(e) => setPartyInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditing(t);
                                if (e.key === "Escape") setEditingFingerprint(null);
                              }}
                              autoFocus
                              className="px-2 py-1 rounded bg-slate-900 border border-indigo-500 text-xs text-white focus:outline-none w-full"
                              placeholder="Type party name..."
                            />
                            <button
                              onClick={() => saveEditing(t)}
                              className="px-2 py-1 rounded bg-indigo-600 text-white text-[11px] hover:bg-indigo-700"
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
                            <span className={t.party_name ? "font-medium text-slate-100" : "text-slate-500 italic"}>
                              {t.party_name || "[Unassigned]"}
                            </span>
                            <Edit2 className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                          isCredit ? "text-emerald-400" : "text-slate-100"
                        }`}
                      >
                        {formatINR(t.amount)}
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
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
                      <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                        {t.utr ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span>{t.utr}</span>
                            <button
                              onClick={() => handleCopyUTR(t.utr)}
                              className="text-slate-500 hover:text-slate-200 p-0.5 transition-colors"
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
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                        {t.balance !== null && t.balance !== undefined
                          ? formatINR(t.balance, "₹ ")
                          : "-"}
                      </td>

                      {/* Tags (Contra / FD) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap space-x-1">
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
    </div>
  );
}
