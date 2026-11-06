"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, Copy, Check, Hash, Calendar, DollarSign, UserCheck, X } from "lucide-react";
import { SearchMode } from "@/types/search";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface SearchBarProps {
  mode: SearchMode;
  query: string;
  onModeChange: (mode: SearchMode) => void;
  onQueryChange: (query: string) => void;
  uniqueUTRs?: string[];
  storedParties?: string[];
}

export function SearchBar({
  mode,
  query,
  onModeChange,
  onQueryChange,
  uniqueUTRs = [],
  storedParties = [],
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Global Ctrl+F / Cmd+F shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopy = () => {
    if (!query) return;
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const getPlaceholder = () => {
    switch (mode) {
      case "utr":
        return "Search by UTR, UPI RRN, Cheque #, or Ref (e.g. 3964, CNRBH0015...)";
      case "date":
        return "Search by exact Date in DD-MM-YYYY (e.g. 15-10-2026)";
      case "amount":
        return "Search by exact Amount (e.g. 25000 or ₹ 25,000)";
      case "party":
        return "Search by Party/Vendor Name (e.g. RAM TRADERS or leave empty for unassigned)";
      default:
        return "Search across all fields...";
    }
  };

  // Filter suggestions for UTR or Party
  const suggestions = React.useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();

    if (mode === "utr") {
      return uniqueUTRs.filter((u) => u.toLowerCase().includes(q)).slice(0, 8);
    }
    if (mode === "party") {
      return storedParties.filter((p) => p.toLowerCase().includes(q)).slice(0, 8);
    }
    return [];
  }, [mode, query, uniqueUTRs, storedParties]);

  return (
    <div className="space-y-2.5">
      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-400 font-medium mr-1">Search Type:</span>

        <button
          onClick={() => onModeChange("utr")}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
            mode === "utr"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
          }`}
        >
          <Hash className="h-3.5 w-3.5" />
          <span>UTR / Reference</span>
        </button>

        <button
          onClick={() => onModeChange("date")}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
            mode === "date"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Date</span>
        </button>

        <button
          onClick={() => onModeChange("amount")}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
            mode === "amount"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Amount</span>
        </button>

        <button
          onClick={() => onModeChange("party")}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
            mode === "party"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Party Name</span>
        </button>

        <button
          onClick={() => onModeChange("all")}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
            mode === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Universal</span>
        </button>
      </div>

      {/* Main Search Input */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={getPlaceholder()}
            className="pl-10 pr-9 h-11 bg-slate-900/90 text-sm border-slate-700 focus-visible:ring-indigo-500 rounded-xl"
          />

          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-800"
              onMouseLeave={() => setShowSuggestions(false)}
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/60">
                Suggestions ({suggestions.length})
              </div>
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onQueryChange(item);
                    setShowSuggestions(false);
                  }}
                  className="px-3.5 py-2 text-sm text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                >
                  <span className="font-mono text-xs">{item}</span>
                  <span className="text-[10px] text-slate-500 uppercase">{mode}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Copy UTR / Query Button */}
        {query && (
          <Button
            variant={copied ? "success" : "secondary"}
            size="lg"
            onClick={handleCopy}
            className="h-11 px-4 gap-1.5 shrink-0"
            title="Copy search query"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
