"use client";

import React from "react";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Percent, Landmark, RefreshCw, ShieldCheck } from "lucide-react";
import { formatINR } from "@/lib/formatters/currency";
import { Card } from "../ui/card";

interface CashflowKPIProps {
  totalInflow: number;
  totalOutflow: number;
  netProfit: number;
  profitMargin: number;
  totalFD: number;
  totalContra: number;
  totalInsurance?: number;
  periodLabel?: string;
  transactionCount?: number;
}

export function CashflowKPICards({
  totalInflow,
  totalOutflow,
  netProfit,
  profitMargin,
  totalFD,
  totalContra,
  totalInsurance = 0,
  periodLabel,
  transactionCount,
}: CashflowKPIProps) {
  const isProfitable = netProfit >= 0;

  return (
    <div className="space-y-3">
      {periodLabel && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">Operating Financials</span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium">
              Period: {periodLabel} {transactionCount !== undefined ? `(${transactionCount} transactions)` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Row 1: Primary Operating Financials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Received */}
        <Card className="p-4 bg-gradient-to-br from-slate-900/90 to-emerald-950/20 border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Business Received</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-400">
            {formatINR(totalInflow)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total revenue / client receipts</p>
        </Card>

        {/* 2. Sent */}
        <Card className="p-4 bg-gradient-to-br from-slate-900/90 to-rose-950/20 border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Business Sent</span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-rose-400">
            {formatINR(totalOutflow)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Vendor & commercial expenses</p>
        </Card>

        {/* 3. Net Profit */}
        <Card
          className={`p-4 border-slate-800 bg-gradient-to-br ${
            isProfitable
              ? "from-slate-900/90 to-indigo-950/20"
              : "from-slate-900/90 to-amber-950/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Net Operating Profit</span>
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                isProfitable
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              {isProfitable ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
          </div>
          <div
            className={`mt-2 text-xl font-bold font-mono ${
              isProfitable ? "text-indigo-400" : "text-amber-400"
            }`}
          >
            {formatINR(netProfit)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isProfitable ? "🟢 Net Surplus" : "🔴 Net Operating Deficit"}
          </p>
        </Card>

        {/* 4. Margin % */}
        <Card className="p-4 bg-slate-900/80 border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Profit Margin</span>
            <div className="h-7 w-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-xl font-bold font-mono ${
              profitMargin >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {profitMargin >= 0 ? "+" : ""}
            {profitMargin.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ratio of Profit / Received</p>
        </Card>
      </div>

      {/* Row 2: Capital Separation (Fixed Deposits, Contra & Insurance Claims) */}
      {(totalFD > 0 || totalContra > 0 || totalInsurance > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {totalFD > 0 && (
            <Card className="p-3.5 bg-slate-900/50 border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Fixed Deposits (Net Investments)</span>
                </span>
                <div className="mt-1 text-lg font-bold font-mono text-indigo-300">
                  {formatINR(totalFD)}
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Asset (Excluded)
              </span>
            </Card>
          )}

          {totalContra > 0 && (
            <Card className="p-3.5 bg-slate-900/50 border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                  <span>Internal Transfers (Contra)</span>
                </span>
                <div className="mt-1 text-lg font-bold font-mono text-amber-300">
                  {formatINR(totalContra)}
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Turnover Excluded
              </span>
            </Card>
          )}

          {totalInsurance > 0 && (
            <Card className="p-3.5 bg-slate-900/50 border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Personal Insurance Claims (LIC/ICICI)</span>
                </span>
                <div className="mt-1 text-lg font-bold font-mono text-emerald-300">
                  {formatINR(totalInsurance)}
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Non-Operating
              </span>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
