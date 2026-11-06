"use client";

import React from "react";
import * as XLSX from "xlsx";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { formatINR } from "@/lib/formatters/currency";
import { MonthlyDataPoint } from "./monthly-chart";
import { Button } from "../ui/button";

interface MonthlyTableProps {
  data: MonthlyDataPoint[];
  allTransactions: any[];
}

export function MonthlyTable({ data, allTransactions }: MonthlyTableProps) {
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

    // Sheet 2: Fixed Deposits & Investments
    const fdTxns = allTransactions
      .filter((t) => t.is_fd_investment)
      .map((t) => ({
        Date: t.date,
        Bank: t.bank,
        Type: t.type,
        Amount: t.amount,
        UTR: t.utr,
        Description: t.description,
        "Party Name": t.party_name,
      }));
    const sheet2 = XLSX.utils.json_to_sheet(fdTxns.length > 0 ? fdTxns : [{ Notice: "No Fixed Deposits" }]);
    XLSX.utils.book_append_sheet(workbook, sheet2, "Fixed Deposits & Investments");

    // Sheet 3: Internal Self Transfers
    const contraTxns = allTransactions
      .filter((t) => t.is_self_transfer)
      .map((t) => ({
        Date: t.date,
        Bank: t.bank,
        Type: t.type,
        Amount: t.amount,
        UTR: t.utr,
        Description: t.description,
        "Party Name": t.party_name,
      }));
    const sheet3 = XLSX.utils.json_to_sheet(
      contraTxns.length > 0 ? contraTxns : [{ Notice: "No Internal Self Transfers" }]
    );
    XLSX.utils.book_append_sheet(workbook, sheet3, "Internal Self Transfers");

    XLSX.writeFile(workbook, "monthly-profit-report.xlsx");
  };

  return (
    <div className="space-y-3">
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
          <span>Download 3-Sheet Excel Report</span>
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
    </div>
  );
}
