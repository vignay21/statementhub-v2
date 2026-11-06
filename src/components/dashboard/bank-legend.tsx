"use client";

import React from "react";
import { getBankStyle, BANK_STYLES, DEFAULT_BANK_STYLE } from "@/lib/constants";

interface BankLegendProps {
  bankCounts: Record<string, number>;
  selectedBank: string;
  onSelectBank: (bank: string) => void;
}

export function BankLegend({ bankCounts, selectedBank, onSelectBank }: BankLegendProps) {
  const banks = Object.keys(bankCounts).filter((b) => bankCounts[b] > 0);
  if (banks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-xs text-slate-400 font-medium mr-1">Bank Filter:</span>

      <button
        onClick={() => onSelectBank("all")}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
          selectedBank === "all"
            ? "bg-slate-700 text-white border-slate-500 shadow-sm"
            : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700"
        }`}
      >
        All Banks ({Object.values(bankCounts).reduce((a, b) => a + b, 0)})
      </button>

      {banks.map((bank) => {
        const style = getBankStyle(bank);
        const count = bankCounts[bank];
        const isSelected = selectedBank === bank;

        return (
          <button
            key={bank}
            onClick={() => onSelectBank(isSelected ? "all" : bank)}
            style={{
              backgroundColor: isSelected ? style.badgeBg : "transparent",
              borderColor: isSelected ? style.badgeBorder : "rgba(51, 65, 85, 0.4)",
              color: style.badgeText,
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
              isSelected ? "ring-1" : "hover:bg-slate-900"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: style.badgeBorder }}
            />
            <span>{bank}</span>
            <span className="opacity-75 font-mono text-[10px]">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
