"use client";

import React from "react";
import { Filter, ArrowUpDown } from "lucide-react";
import { PeriodFilter, SortOrder } from "@/types/search";

interface FiltersBarProps {
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (d: string) => void;
  onEndDateChange?: (d: string) => void;
  sort: SortOrder;
  onSortChange: (s: SortOrder) => void;
  excludeContra: boolean;
  onExcludeContraChange: (val: boolean) => void;
  excludeFD: boolean;
  onExcludeFDChange: (val: boolean) => void;
}

export function FiltersBar({
  period,
  onPeriodChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  sort,
  onSortChange,
  excludeContra,
  onExcludeContraChange,
  excludeFD,
  onExcludeFDChange,
}: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-300">
      {/* Left controls: Period & Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-400 font-medium flex items-center gap-1">
          <Filter className="h-3 w-3" /> Period:
        </span>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as PeriodFilter)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_30_days">Last 30 Days</option>
          <option value="fy">Financial Year (Apr - Mar)</option>
          <option value="custom">Custom Date Range</option>
        </select>

        {period === "custom" && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate || ""}
              onChange={(e) => onStartDateChange && onStartDateChange(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate || ""}
              onChange={(e) => onEndDateChange && onEndDateChange(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
            />
          </div>
        )}

        <span className="text-slate-400 font-medium ml-2 flex items-center gap-1">
          <ArrowUpDown className="h-3 w-3" /> Sort:
        </span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOrder)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="date_desc">Date: Newest First</option>
          <option value="date_asc">Date: Oldest First</option>
          <option value="amount_desc">Amount: Highest First</option>
          <option value="amount_asc">Amount: Lowest First</option>
        </select>
      </div>

      {/* Right controls: Contra & FD exclusion toggles */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeContra}
            onChange={(e) => onExcludeContraChange(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
          />
          <span className="text-slate-300">Exclude Self-Transfers (Contra)</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeFD}
            onChange={(e) => onExcludeFDChange(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
          />
          <span className="text-slate-300">Exclude Fixed Deposits (Investments)</span>
        </label>
      </div>
    </div>
  );
}
