"use client";

import React from "react";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Info } from "lucide-react";
import { formatINR } from "@/lib/formatters/currency";
import { Card } from "../ui/card";

interface QuickCashflowProps {
  totalInflow: number;
  totalOutflow: number;
  netProfit: number;
  excludedContraTotal: number;
  excludedFDTotal: number;
}

export function QuickCashflow({
  totalInflow,
  totalOutflow,
  netProfit,
  excludedContraTotal,
  excludedFDTotal,
}: QuickCashflowProps) {
  const isProfitable = netProfit >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-3">
      {/* 1. Business Inflows */}
      <Card className="p-4 bg-gradient-to-br from-slate-900/90 to-emerald-950/20 border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Business Received (Inflow)</span>
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold font-mono text-emerald-400">
          {formatINR(totalInflow)}
        </div>
        {excludedContraTotal > 0 && (
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Info className="h-3 w-3 shrink-0" /> Excluded {formatINR(excludedContraTotal)} contra
          </p>
        )}
      </Card>

      {/* 2. Business Outflows */}
      <Card className="p-4 bg-gradient-to-br from-slate-900/90 to-rose-950/20 border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Business Sent (Outflow)</span>
          <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold font-mono text-rose-400">
          {formatINR(totalOutflow)}
        </div>
        {excludedFDTotal > 0 && (
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Info className="h-3 w-3 shrink-0" /> Excluded {formatINR(excludedFDTotal)} investments
          </p>
        )}
      </Card>

      {/* 3. Net Business Profit */}
      <Card
        className={`p-4 border-slate-800 bg-gradient-to-br ${
          isProfitable
            ? "from-slate-900/90 to-indigo-950/20"
            : "from-slate-900/90 to-amber-950/20"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Net Business Profit</span>
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
          {isProfitable ? "🟢 Surplus across selected period" : "🔴 Deficit in selected period"}
        </p>
      </Card>
    </div>
  );
}
