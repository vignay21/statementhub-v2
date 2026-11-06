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

interface SuggestionItem {
  text: string;
  type: string;
}

export function SearchBar({
  mode,
  query,
  onModeChange,
  onQueryChange,
  uniqueUTRs = [],
  storedParties = [],
}: SearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [copied, setCopied] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Global Ctrl+F / Cmd+F shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  // Filter suggestions for UTR or Party (or Universal)
  const suggestions: SuggestionItem[] = React.useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();

    if (mode === "utr") {
      return uniqueUTRs
        .filter((u) => u.toLowerCase().includes(q))
        .slice(0, 8)
        .map((text) => ({ text, type: "UTR" }));
    }
    if (mode === "party") {
      return storedParties
        .filter((p) => p.toLowerCase().includes(q))
        .slice(0, 8)
        .map((text) => ({ text, type: "Party" }));
    }
    if (mode === "all") {
      const utrMatches = uniqueUTRs
        .filter((u) => u.toLowerCase().includes(q))
        .slice(0, 5)
        .map((text) => ({ text, type: "UTR" }));
      const partyMatches = storedParties
        .filter((p) => p.toLowerCase().includes(q))
        .slice(0, 5)
        .map((text) => ({ text, type: "Party" }));
      return [...utrMatches, ...partyMatches].slice(0, 8);
    }
    return [];
  }, [mode, query, uniqueUTRs, storedParties]);

  // Reset selectedIndex whenever suggestions or query change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions.length, query]);

  // Keep highlighted suggestion scrolled into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const selectSuggestion = (itemText: string) => {
    onQueryChange(itemText);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showSuggestions) {
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setSelectedIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!showSuggestions) {
        setShowSuggestions(true);
        setSelectedIndex(suggestions.length - 1);
      } else {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === "Enter") {
      if (showSuggestions && selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex].text);
      } else if (showSuggestions) {
        setShowSuggestions(false);
      }
    } else if (e.key === "Escape") {
      if (showSuggestions) {
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    } else if (e.key === "Tab") {
      if (showSuggestions && selectedIndex >= 0 && selectedIndex < suggestions.length) {
        selectSuggestion(suggestions[selectedIndex].text);
      } else {
        setShowSuggestions(false);
      }
    }
  };

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
        <div ref={containerRef} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (query.trim().length >= 2) setShowSuggestions(true);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={getPlaceholder()}
            className="pl-10 pr-9 h-11 bg-slate-900/90 text-sm border-slate-700 focus-visible:ring-indigo-500 rounded-xl"
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-autocomplete="list"
            aria-controls="autocomplete-dropdown"
          />

          {query && (
            <button
              onClick={() => {
                onQueryChange("");
                setShowSuggestions(false);
                setSelectedIndex(-1);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              id="autocomplete-dropdown"
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 max-h-64 overflow-y-auto"
            >
              <div className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/80 sticky top-0 flex items-center justify-between z-10 backdrop-blur-sm">
                <span>Suggestions ({suggestions.length})</span>
                <span className="text-[10px] text-slate-500 normal-case font-normal">
                  Use ↑↓ arrows to navigate, Enter to select
                </span>
              </div>
              {suggestions.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={`${item.type}-${item.text}-${idx}`}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(item.text);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3.5 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-indigo-600/30 text-white border-l-2 border-indigo-400 pl-3 font-medium"
                        : "text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <span className="font-mono text-xs truncate mr-2">{item.text}</span>
                    <span className="text-[10px] text-slate-400 uppercase px-1.5 py-0.5 rounded bg-slate-800 shrink-0">
                      {item.type}
                    </span>
                  </div>
                );
              })}
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
