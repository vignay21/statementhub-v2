"use client";

import React from "react";
import { Filter, ArrowUpDown, Calendar, Clock } from "lucide-react";
import { PeriodFilter, SortOrder } from "@/types/search";

export interface MonthOption {
  label: string;
  value: string;
  count: number;
}

interface FiltersBarProps {
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (d: string) => void;
  onEndDateChange?: (d: string) => void;
  sort?: SortOrder;
  onSortChange?: (s: SortOrder) => void;
  excludeContra: boolean;
  onExcludeContraChange: (val: boolean) => void;
  excludeFD: boolean;
  onExcludeFDChange: (val: boolean) => void;
  availableMonths?: MonthOption[];
  selectedMonth?: string;
  onSelectedMonthChange?: (m: string) => void;
  hideSort?: boolean;
  activePeriodLabel?: string;
  matchingCount?: number;
}

export function FiltersBar({
  period,
  onPeriodChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  sort = "date_desc",
  onSortChange,
  excludeContra,
  onExcludeContraChange,
  excludeFD,
  onExcludeFDChange,
  availableMonths = [],
  selectedMonth,
  onSelectedMonthChange,
  hideSort = false,
  activePeriodLabel,
  matchingCount,
}: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 shadow-sm">
      {/* Left controls: Period, Month Picker & Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-400 font-medium flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-indigo-400" />
          <span>Period:</span>
        </span>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as PeriodFilter)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="last_30_days">Last 30 Days</option>
          <option value="last_90_days">Last 90 Days (Quarter)</option>
          <option value="fy">Financial Year (Apr - Mar)</option>
          <option value="prev_fy">Previous Financial Year</option>
          {availableMonths.length > 0 && (
            <option value="month_select">Specific Month...</option>
          )}
          <option value="custom">Custom Date Range</option>
        </select>

        {/* Specific Month Selector */}
        {period === "month_select" && availableMonths.length > 0 && (
          <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
            <select
              value={selectedMonth || availableMonths[0]?.value}
              onChange={(e) => onSelectedMonthChange && onSelectedMonthChange(e.target.value)}
              className="bg-slate-800 border border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-xs text-indigo-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.count} txns)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Date Inputs */}
        {period === "custom" && (
          <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
            <input
              type="date"
              value={startDate || ""}
              onChange={(e) => onStartDateChange && onStartDateChange(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate || ""}
              onChange={(e) => onEndDateChange && onEndDateChange(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Active Period Pill */}
        {activePeriodLabel && (
          <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[11px] font-medium text-indigo-300">
            <Clock className="h-3 w-3" />
            <span>{activePeriodLabel}</span>
            {matchingCount !== undefined && (
              <span className="text-slate-400 font-normal">({matchingCount} txns)</span>
            )}
          </span>
        )}

        {/* Sort Controls (optional) */}
        {!hideSort && onSortChange && (
          <>
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
          </>
        )}
      </div>

      {/* Right controls: Contra & FD exclusion toggles */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeContra}
            onChange={(e) => onExcludeContraChange(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
          />
          <span className="text-slate-300">Exclude Self-Transfers (Contra)</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
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
