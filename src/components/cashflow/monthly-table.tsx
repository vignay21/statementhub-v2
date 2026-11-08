"use client";

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Landmark,
  ShieldCheck,
  ArrowRightLeft,
} from "lucide-react";
import { formatINR } from "@/lib/formatters/currency";
import { MonthlyDataPoint } from "./monthly-chart";
import { Button } from "../ui/button";
import { Transaction } from "@/types/transaction";

interface MonthlyTableProps {
  data: MonthlyDataPoint[];
  allTransactions: Transaction[];
}

export function MonthlyTable({ data, allTransactions }: MonthlyTableProps) {
  const [showBankBreakdown, setShowBankBreakdown] = useState(false);
  const [showFDs, setShowFDs] = useState(false);
  const [showContra, setShowContra] = useState(false);

  // P6 & Q4 fix: Single-pass iteration for bankBreakdown, fdTxns, contraTxns, and insuranceTxns
  const { bankBreakdown, fdTxns, contraTxns, insuranceTxns } = useMemo(() => {
    const map = new Map<string, { month: string; bank: string; received: number; sent: number }>();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const fds: Transaction[] = [];
    const contras: Transaction[] = [];
    const insurances: Transaction[] = [];

    allTransactions.forEach((t) => {
      if (t.is_fd_investment) fds.push(t);
      if (t.is_self_transfer) contras.push(t);
      if (t.is_insurance_claim) insurances.push(t);

      if (t.is_self_transfer || t.is_fd_investment || t.is_insurance_claim) return;
      const parts = (t.date || "").split("-");
      if (parts.length === 3) {
        const mIdx = parseInt(parts[1], 10) - 1;
        const mName = `${monthNames[mIdx]} ${parts[2]}`;
        const bank = t.bank || "Other Bank";
        const key = `${mName}_${bank}`;

        if (!map.has(key)) {
          map.set(key, { month: mName, bank, received: 0, sent: 0 });
        }
        const entry = map.get(key)!;
        if (t.type === "Credit") entry.received += t.amount || 0;
        else if (t.type === "Debit") entry.sent += t.amount || 0;
      }
    });

    const sortedBreakdown = Array.from(map.values()).sort(
      (a, b) => b.month.localeCompare(a.month) || a.bank.localeCompare(b.bank)
    );

    return {
      bankBreakdown: sortedBreakdown,
      fdTxns: fds,
      contraTxns: contras,
      insuranceTxns: insurances,
    };
  }, [allTransactions]);

  const exportMultiSheetExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Monthly Operating Profit
    const monthlyRows = data.map((d) => ({
      Month: d.month,
      "Business Received": d.inflow,
      "Business Sent": d.outflow,
      "Net Profit / Surplus": d.netProfit,
      Status: d.netProfit >= 0 ? "Surplus" : "Deficit",
      "Margin %": d.inflow > 0 ? `${((d.netProfit / d.inflow) * 100).toFixed(1)}%` : "0%",
      "Fixed Deposits (Assets)": d.fd,
      "Internal Transfers (Contra)": d.contra,
      Transactions: d.transactionsCount,
    }));
    const sheet1 = XLSX.utils.json_to_sheet(monthlyRows);
    XLSX.utils.book_append_sheet(workbook, sheet1, "Monthly Operating Profit");

    // Sheet 2: Bank Breakdown
    const bankRows = bankBreakdown.map((b) => ({
      Month: b.month,
      Bank: b.bank,
      "Business Received": b.received,
      "Business Sent": b.sent,
      "Net Profit / Surplus": b.received - b.sent,
      Status: b.received >= b.sent ? "Profit" : "Deficit",
    }));
    const sheetBank = XLSX.utils.json_to_sheet(
      bankRows.length > 0 ? bankRows : [{ Notice: "No Bank Breakdown Data" }]
    );
    XLSX.utils.book_append_sheet(workbook, sheetBank, "Bank Breakdown");

    // Sheet 3: Fixed Deposits & Investments
    const fdExportRows = fdTxns.map((t) => ({
      Date: t.date,
      Bank: t.bank,
      Type: t.type,
      Amount: t.amount,
      UTR: t.utr,
      Description: t.description,
      "Party Name": t.party_name,
    }));
    const sheet2 = XLSX.utils.json_to_sheet(
      fdExportRows.length > 0 ? fdExportRows : [{ Notice: "No Fixed Deposits" }]
    );
    XLSX.utils.book_append_sheet(workbook, sheet2, "Fixed Deposits & Investments");

    // Sheet 4: Internal Self Transfers
    const contraExportRows = contraTxns.map((t) => ({
      Date: t.date,
      Bank: t.bank,
      Type: t.type,
      Amount: t.amount,
      UTR: t.utr,
      Description: t.description,
      "Party Name": t.party_name,
    }));
    const sheet3 = XLSX.utils.json_to_sheet(
      contraExportRows.length > 0 ? contraExportRows : [{ Notice: "No Internal Self Transfers" }]
    );
    XLSX.utils.book_append_sheet(workbook, sheet3, "Internal Self Transfers");

    // Sheet 5: Personal Insurance Claims & Payouts
    const insuranceExportRows = insuranceTxns.map((t) => ({
      Date: t.date,
      Bank: t.bank,
      Type: t.type,
      Amount: t.amount,
      UTR: t.utr,
      Description: t.description,
      "Party Name": t.party_name,
    }));
    const sheet4 = XLSX.utils.json_to_sheet(
      insuranceExportRows.length > 0 ? insuranceExportRows : [{ Notice: "No Insurance Claims" }]
    );
    XLSX.utils.book_append_sheet(workbook, sheet4, "Insurance Claims & Payouts");

    XLSX.writeFile(workbook, "monthly-profit-report.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">
          Month-by-Month Operating Breakdown
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={exportMultiSheetExcel}
          className="h-8 gap-1.5 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download 4-Sheet Excel Report</span>
        </Button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Month</th>
                <th className="py-3 px-3 text-right">Received (Credits)</th>
                <th className="py-3 px-3 text-right">Sent (Debits)</th>
                <th className="py-3 px-3 text-right">Net Profit / Loss</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Margin %</th>
                <th className="py-3 px-3 text-right">Fixed Deposits</th>
                <th className="py-3 px-3 text-right">Self Transfers</th>
                <th className="py-3 px-3 text-center">Txns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {data.map((row) => {
                const isProfitable = row.netProfit >= 0;
                const margin =
                  row.inflow > 0 ? ((row.netProfit / row.inflow) * 100).toFixed(1) : "0.0";

                return (
                  <tr key={row.month} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold text-slate-200">{row.month}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                      {formatINR(row.inflow)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                      {formatINR(row.outflow)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-semibold ${
                        isProfitable ? "text-indigo-400" : "text-amber-400"
                      }`}
                    >
                      {formatINR(row.netProfit)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          isProfitable
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {isProfitable ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{isProfitable ? "Surplus" : "Deficit"}</span>
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono ${
                        isProfitable ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {margin}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {row.fd > 0 ? formatINR(row.fd) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {row.contra > 0 ? formatINR(row.contra) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                      {row.transactionsCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanders: Bank Breakdown, FDs, Contra */}
      <div className="space-y-2 pt-2">
        {/* 1. Bank Breakdown Expander */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <button
            onClick={() => setShowBankBreakdown(!showBankBreakdown)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-indigo-400" />
              <span>View Bank-Wise Breakdown for Each Month</span>
            </div>
            {showBankBreakdown ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {showBankBreakdown && (
            <div className="border-t border-slate-800 p-3 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2 px-3">Month</th>
                    <th className="py-2 px-3">Bank</th>
                    <th className="py-2 px-3 text-right">Received</th>
                    <th className="py-2 px-3 text-right">Sent</th>
                    <th className="py-2 px-3 text-right">Net Profit</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {bankBreakdown.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-300 font-sans">{b.month}</td>
                      <td className="py-2 px-3 text-slate-200 font-sans">{b.bank}</td>
                      <td className="py-2 px-3 text-right text-emerald-400">{formatINR(b.received)}</td>
                      <td className="py-2 px-3 text-right text-rose-400">{formatINR(b.sent)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-indigo-400">
                        {formatINR(b.received - b.sent)}
                      </td>
                      <td className="py-2 px-3 text-center font-sans">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            b.received >= b.sent
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {b.received >= b.sent ? "Profit" : "Deficit"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 2. Fixed Deposits Expander */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <button
            onClick={() => setShowFDs(!showFDs)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>View All Fixed Deposits & Capital Investments ({fdTxns.length} entries)</span>
            </div>
            {showFDs ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {showFDs && (
            <div className="border-t border-slate-800 p-3 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold font-sans">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Bank</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {fdTxns.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-300">{t.date}</td>
                      <td className="py-2 px-3 text-slate-200 font-sans">{t.bank}</td>
                      <td className="py-2 px-3 text-slate-300 text-[11px] max-w-sm truncate">
                        {t.description}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-400">
                        {formatINR(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3. Internal Self Transfers Expander */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <button
            onClick={() => setShowContra(!showContra)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-amber-400" />
              <span>View All Detected Internal Self-Transfers ({contraTxns.length} entries)</span>
            </div>
            {showContra ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {showContra && (
            <div className="border-t border-slate-800 p-3 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold font-sans">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Bank</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {contraTxns.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-300">{t.date}</td>
                      <td className="py-2 px-3 text-slate-200 font-sans">{t.bank}</td>
                      <td className="py-2 px-3 text-slate-400 font-sans">{t.type}</td>
                      <td className="py-2 px-3 text-slate-300 text-[11px] max-w-sm truncate">
                        {t.description}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-amber-400">
                        {formatINR(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
