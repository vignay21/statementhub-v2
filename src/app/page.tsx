"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, TrendingUp, UploadCloud, Database, HardDrive, ShieldCheck, Sparkles, Layers } from "lucide-react";
import { Transaction } from "@/types/transaction";
import { ImportedStatement } from "@/types/statement";
import { SearchMode, PeriodFilter, SortOrder } from "@/types/search";
import { detectContraTransfers } from "@/lib/business/contra-detector";
import { detectFixedDeposits } from "@/lib/business/fd-detector";
import { parseDateToTime } from "@/lib/formatters/date";
import { getLocalGeminiUsage } from "@/lib/ai/usage-tracker";
import { StorageStats } from "@/lib/supabase/storage-stats";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { BankLegend } from "@/components/dashboard/bank-legend";
import { QuickCashflow } from "@/components/dashboard/quick-cashflow";
import { SearchBar } from "@/components/dashboard/search-bar";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { TransactionTable } from "@/components/dashboard/transaction-table";
import { CashflowKPICards } from "@/components/cashflow/kpi-cards";
import { MonthlyChart, MonthlyDataPoint } from "@/components/cashflow/monthly-chart";
import { MonthlyTable } from "@/components/cashflow/monthly-table";
import { AIPartyAssistant } from "@/components/ai/party-assistant";
import { CapacityTracker } from "@/components/storage/capacity-tracker";
import { BackupRestore } from "@/components/storage/backup-restore";
import { PartyManager } from "@/components/party/party-manager";
import { DEFAULT_STORED_PARTY_NAMES } from "@/lib/constants/default-parties";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"search" | "cashflow">("search");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [storedParties, setStoredParties] = useState<string[]>(DEFAULT_STORED_PARTY_NAMES);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats>({
    usedBytes: 0,
    usedMB: 0,
    totalMB: 500,
    freeMB: 500,
    usedPercentage: 0,
    totalRecords: 0,
    remainingCapacity: 600000,
  });
  const [geminiRequestsLeft, setGeminiRequestsLeft] = useState(1500);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter state
  const [searchMode, setSearchMode] = useState<SearchMode>("utr");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");
  const [excludeContra, setExcludeContra] = useState(true);
  const [excludeFD, setExcludeFD] = useState(true);

  // Initial data loading from API
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch transactions
      let loadedTransactions: Transaction[] = [];
      const res = await fetch("/api/transactions/search");
      if (res.ok) {
        const data = await res.json();
        if (data.transactions && data.transactions.length > 0) {
          loadedTransactions = data.transactions;
          setTransactions(data.transactions);
          setSupabaseConnected(true);
        }
      }

      // 2. Fetch stored parties from backend
      let partiesFromDB: string[] = [];
      try {
        const partyRes = await fetch("/api/transactions/party");
        if (partyRes.ok) {
          const partyData = await partyRes.json();
          if (Array.isArray(partyData.parties)) {
            partiesFromDB = partyData.parties;
          }
        }
      } catch (e) {}

      // 3. Local offline cache fallback
      let localParties: string[] = [];
      try {
        const raw = localStorage.getItem("stored_parties_directory");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localParties = parsed;
          }
        }
      } catch (e) {}

      // 4. Also collect distinct explicitly assigned party names on transactions
      const txParties = loadedTransactions
        .map((t) => t.party_name?.trim())
        .filter((n): n is string => Boolean(n));

      const combinedParties = Array.from(
        new Set([
          ...DEFAULT_STORED_PARTY_NAMES,
          ...partiesFromDB,
          ...localParties,
          ...txParties,
        ])
      )
        .filter((p) => p && typeof p === "string" && p.trim())
        .sort((a, b) => a.localeCompare(b));

      setStoredParties(combinedParties);
      try {
        localStorage.setItem("stored_parties_directory", JSON.stringify(combinedParties));
      } catch (e) {}

      // 5. Fetch storage stats
      const statsRes = await fetch("/api/storage/stats");
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setStorageStats(stats);
      }

      // 6. Gemini usage
      const usage = getLocalGeminiUsage();
      setGeminiRequestsLeft(usage.requestsRemaining);
    } catch (e) {
      console.log("Running in offline/browser mode");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute tags for transactions (Contra & FD & Duplicate UTRs)
  const annotatedTransactions = useMemo(() => {
    if (transactions.length === 0) return [];
    const contraFlags = detectContraTransfers(transactions);
    const fdFlags = detectFixedDeposits(transactions);

    // Compute duplicate UTRs
    const utrCounts: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.utr && t.utr.trim().length > 3) {
        const u = t.utr.trim().toUpperCase();
        utrCounts[u] = (utrCounts[u] || 0) + 1;
      }
    });

    return transactions.map((t, i) => ({
      ...t,
      is_self_transfer: contraFlags[i],
      is_fd_investment: fdFlags[i],
      is_duplicate_utr: Boolean(t.utr && utrCounts[t.utr.trim().toUpperCase()] > 1),
    }));
  }, [transactions]);

  // Latest recorded date per bank
  const latestDatesPerBank = useMemo(() => {
    const datesMap: Record<string, string> = {};
    transactions.forEach((t) => {
      if (!t.bank || !t.date) return;
      const b = t.bank.trim();
      const parts = t.date.split("-");
      if (parts.length === 3) {
        const iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
        if (!datesMap[b] || iso > datesMap[b]) {
          datesMap[b] = iso;
        }
      }
    });

    const result: { bank: string; date: string }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    Object.keys(datesMap).sort().forEach((b) => {
      const parts = datesMap[b].split("-");
      const mIdx = parseInt(parts[1], 10) - 1;
      result.push({ bank: b, date: `${parts[2]}-${monthNames[mIdx]}-${parts[0]}` });
    });
    return result;
  }, [transactions]);

  // Handle uploaded statements
  const handleStatementsParsed = async (statements: ImportedStatement[]) => {
    const allNew: Transaction[] = [];
    statements.forEach((s) => allNew.push(...s.transactions));

    if (allNew.length === 0) return;

    // Harvest party names from uploaded transactions
    const newParties = allNew
      .map((t) => t.party_name?.trim())
      .filter((n): n is string => Boolean(n));
    if (newParties.length > 0) {
      setStoredParties((prev) => {
        const next = Array.from(new Set([...prev, ...newParties])).sort((a, b) => a.localeCompare(b));
        try {
          localStorage.setItem("stored_parties_directory", JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }

    // Try cloud sync if connected
    try {
      const syncRes = await fetch("/api/transactions/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: allNew }),
      });

      if (syncRes.ok) {
        setSupabaseConnected(true);
        await loadData();
        return;
      }
    } catch (e) {}

    // Fallback in-memory
    setTransactions((prev) => [...allNew, ...prev]);
  };

  // Update party name
  const handleUpdatePartyName = async (
    fingerprint: string,
    matchKey: string,
    newParty: string
  ) => {
    // Optimistic local update
    setTransactions((prev) =>
      prev.map((t) => (t.fingerprint === fingerprint ? { ...t, party_name: newParty } : t))
    );

    if (newParty && newParty.trim()) {
      const clean = newParty.trim();
      setStoredParties((prev) => {
        const next = Array.from(new Set([...prev, clean])).sort((a, b) => a.localeCompare(b));
        try {
          localStorage.setItem("stored_parties_directory", JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }

    try {
      await fetch("/api/transactions/party", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint, match_key: matchKey, party_name: newParty }),
      });
    } catch (e) {}
  };

  // Bulk apply AI suggestions
  const handleApplyAISuggestions = async (
    approved: { fingerprint: string; matchKey: string; partyName: string }[]
  ) => {
    const lookup = new Map<string, string>();
    approved.forEach((a) => lookup.set(a.fingerprint, a.partyName));

    setTransactions((prev) =>
      prev.map((t) => {
        if (lookup.has(t.fingerprint)) {
          return { ...t, party_name: lookup.get(t.fingerprint)! };
        }
        return t;
      })
    );

    const approvedNames = approved
      .map((a) => a.partyName?.trim())
      .filter((n): n is string => Boolean(n));
    if (approvedNames.length > 0) {
      setStoredParties((prev) => {
        const next = Array.from(new Set([...prev, ...approvedNames])).sort((a, b) => a.localeCompare(b));
        try {
          localStorage.setItem("stored_parties_directory", JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }

    // Sync to backend
    for (const item of approved) {
      try {
        await fetch("/api/transactions/party", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fingerprint: item.fingerprint,
            match_key: item.matchKey,
            party_name: item.partyName,
          }),
        });
      } catch (e) {}
    }
  };

  // Bank counts for legend
  const bankCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    annotatedTransactions.forEach((t) => {
      counts[t.bank] = (counts[t.bank] || 0) + 1;
    });
    return counts;
  }, [annotatedTransactions]);

  // Unique UTRs for autocomplete
  const uniqueUTRs = useMemo(() => {
    const set = new Set<string>();
    annotatedTransactions.forEach((t) => {
      if (t.utr && t.utr.trim()) set.add(t.utr.trim());
    });
    return Array.from(set);
  }, [annotatedTransactions]);

  // Distinct months present in uploaded statements
  const availableMonths = useMemo(() => {
    const map = new Map<string, { label: string; value: string; count: number; time: number }>();
    annotatedTransactions.forEach((t) => {
      if (!t.date) return;
      const parts = t.date.split("-");
      if (parts.length === 3) {
        const monthNum = parseInt(parts[1], 10);
        const yearNum = parseInt(parts[2], 10);
        if (monthNum >= 1 && monthNum <= 12 && yearNum > 1900) {
          const value = `${String(monthNum).padStart(2, "0")}-${yearNum}`;
          const dateObj = new Date(yearNum, monthNum - 1, 1);
          const label = dateObj.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
          const existing = map.get(value);
          if (existing) {
            existing.count += 1;
          } else {
            map.set(value, { label, value, count: 1, time: dateObj.getTime() });
          }
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.time - a.time);
  }, [annotatedTransactions]);

  // Set default selected month if not set
  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0].value);
    }
  }, [availableMonths, selectedMonth]);

  // Base transactions filtered by Bank and Period
  const periodFilteredTransactions = useMemo(() => {
    let result = annotatedTransactions;

    // Bank filter
    if (selectedBank !== "all") {
      result = result.filter((t) => t.bank === selectedBank);
    }

    // Period filter
    const now = new Date();
    if (period.startsWith("month:")) {
      const monthKey = period.replace("month:", "");
      const [selM, selY] = monthKey.split("-");
      result = result.filter((t) => {
        const parts = t.date.split("-");
        return parts[1] === selM && parts[2] === selY;
      });
    } else if (period === "this_month") {
      const curMonth = String(now.getMonth() + 1).padStart(2, "0");
      const curYear = String(now.getFullYear());
      result = result.filter((t) => {
        const parts = t.date.split("-");
        return parts[1] === curMonth && parts[2] === curYear;
      });
    } else if (period === "last_month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const curMonth = String(lm.getMonth() + 1).padStart(2, "0");
      const curYear = String(lm.getFullYear());
      result = result.filter((t) => {
        const parts = t.date.split("-");
        return parts[1] === curMonth && parts[2] === curYear;
      });
    } else if (period === "last_30_days") {
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      const thirtyDaysAgo = endOfToday - 30 * 24 * 60 * 60 * 1000;
      result = result.filter((t) => {
        const time = parseDateToTime(t.date);
        return time >= thirtyDaysAgo && time <= endOfToday;
      });
    } else if (period === "last_90_days") {
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      const ninetyDaysAgo = endOfToday - 90 * 24 * 60 * 60 * 1000;
      result = result.filter((t) => {
        const time = parseDateToTime(t.date);
        return time >= ninetyDaysAgo && time <= endOfToday;
      });
    } else if (period === "fy") {
      // Current Indian FY: Apr 1 of current or last year to Mar 31 of next year
      const curYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const startFY = new Date(curYear, 3, 1, 0, 0, 0, 0).getTime();
      const endFY = new Date(curYear + 1, 2, 31, 23, 59, 59, 999).getTime();
      result = result.filter((t) => {
        const time = parseDateToTime(t.date);
        return time >= startFY && time <= endFY;
      });
    } else if (period === "prev_fy") {
      // Previous Indian FY
      const curYear = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) - 1;
      const startFY = new Date(curYear, 3, 1, 0, 0, 0, 0).getTime();
      const endFY = new Date(curYear + 1, 2, 31, 23, 59, 59, 999).getTime();
      result = result.filter((t) => {
        const time = parseDateToTime(t.date);
        return time >= startFY && time <= endFY;
      });
    } else if (period === "month_select" && selectedMonth) {
      const [selM, selY] = selectedMonth.split("-");
      result = result.filter((t) => {
        const parts = t.date.split("-");
        return parts[1] === selM && parts[2] === selY;
      });
    } else if (period === "custom" && startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + 86400000;
      result = result.filter((t) => {
        const time = parseDateToTime(t.date);
        return time >= start && time <= end;
      });
    }

    return result;
  }, [
    annotatedTransactions,
    selectedBank,
    period,
    selectedMonth,
    startDate,
    endDate,
  ]);

  // Financial metrics for selected period (Business Received, Business Sent, Net Operating Profit)
  const quickFinancials = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let contraTotal = 0;
    let fdTotal = 0;

    periodFilteredTransactions.forEach((t) => {
      if (t.is_self_transfer) {
        contraTotal += t.amount;
        if (excludeContra) return;
      }
      if (t.is_fd_investment) {
        fdTotal += t.amount;
        if (excludeFD) return;
      }

      if (t.type === "Credit") inflow += t.amount;
      if (t.type === "Debit") outflow += t.amount;
    });

    const netProfit = inflow - outflow;
    const profitMargin = inflow > 0 ? (netProfit / inflow) * 100 : 0;

    return {
      inflow,
      outflow,
      netProfit,
      profitMargin,
      contraTotal,
      fdTotal,
      transactionCount: periodFilteredTransactions.length,
    };
  }, [periodFilteredTransactions, excludeContra, excludeFD]);

  // Detailed Filter & Sort for Transactions Table
  const filteredTransactions = useMemo(() => {
    let result = periodFilteredTransactions;

    // Exclude Contra
    if (excludeContra) {
      result = result.filter((t) => !t.is_self_transfer);
    }

    // Exclude FD
    if (excludeFD) {
      result = result.filter((t) => !t.is_fd_investment);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();

      if (searchMode === "utr") {
        result = result.filter(
          (t) =>
            t.utr.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q)
        );
      } else if (searchMode === "date") {
        result = result.filter((t) => t.date.includes(q));
      } else if (searchMode === "amount") {
        const cleanAmt = parseFloat(q.replace(/,/g, ""));
        if (!isNaN(cleanAmt)) {
          result = result.filter((t) => Math.abs(t.amount - cleanAmt) < 0.05);
        } else {
          result = result.filter((t) => String(t.amount).includes(q));
        }
      } else if (searchMode === "party") {
        result = result.filter((t) =>
          q === "unassigned" ? !t.party_name : t.party_name.toLowerCase().includes(q)
        );
      } else {
        result = result.filter(
          (t) =>
            t.description.toLowerCase().includes(q) ||
            t.party_name.toLowerCase().includes(q) ||
            t.utr.toLowerCase().includes(q) ||
            t.bank.toLowerCase().includes(q) ||
            t.date.includes(q)
        );
      }
    }

    // Sort order
    return [...result].sort((a, b) => {
      if (sortOrder === "date_desc") {
        return parseDateToTime(b.date) - parseDateToTime(a.date);
      }
      if (sortOrder === "date_asc") {
        return parseDateToTime(a.date) - parseDateToTime(b.date);
      }
      if (sortOrder === "amount_desc") {
        return b.amount - a.amount;
      }
      if (sortOrder === "amount_asc") {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [
    periodFilteredTransactions,
    excludeContra,
    excludeFD,
    searchQuery,
    searchMode,
    sortOrder,
  ]);

  // Monthly aggregated data for Cash Flow tab
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, MonthlyDataPoint>();

    periodFilteredTransactions.forEach((t) => {
      const parts = t.date.split("-");
      if (parts.length < 3) return;
      const monthYear = `${parts[1]}-${parts[2]}`; // MM-YYYY

      if (!monthMap.has(monthYear)) {
        monthMap.set(monthYear, {
          month: monthYear,
          inflow: 0,
          outflow: 0,
          netProfit: 0,
          fd: 0,
          contra: 0,
          transactionsCount: 0,
        });
      }

      const item = monthMap.get(monthYear)!;
      item.transactionsCount++;

      if (t.is_self_transfer) item.contra += t.amount;
      if (t.is_fd_investment) item.fd += t.amount;

      const skipThisForProfit =
        (excludeContra && t.is_self_transfer) || (excludeFD && t.is_fd_investment);

      if (!skipThisForProfit) {
        if (t.type === "Credit") item.inflow += t.amount;
        if (t.type === "Debit") item.outflow += t.amount;
      }
    });

    const list = Array.from(monthMap.values()).map((item) => ({
      ...item,
      netProfit: item.inflow - item.outflow,
    }));

    // Sort chronologically
    return list.sort((a, b) => {
      const [mA, yA] = a.month.split("-").map(Number);
      const [mB, yB] = b.month.split("-").map(Number);
      return yA !== yB ? yA - yB : mA - mB;
    });
  }, [periodFilteredTransactions, excludeContra, excludeFD]);

  // Active period display label
  const getPeriodLabel = () => {
    if (period.startsWith("month:")) {
      const mVal = period.replace("month:", "");
      const found = availableMonths.find((m) => m.value === mVal);
      if (found) return found.label;
      const [mm, yyyy] = mVal.split("-");
      const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, 1);
      return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    }

    switch (period) {
      case "this_month": {
        const now = new Date();
        return `This Month (${now.toLocaleDateString("en-IN", { month: "short", year: "numeric" })})`;
      }
      case "last_month": {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `Last Month (${d.toLocaleDateString("en-IN", { month: "short", year: "numeric" })})`;
      }
      case "last_30_days":
        return "Last 30 Days";
      case "last_90_days":
        return "Last 90 Days (Quarter)";
      case "fy": {
        const now = new Date();
        const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        return `FY ${y}-${String(y + 1).slice(2)}`;
      }
      case "prev_fy": {
        const now = new Date();
        const y = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) - 1;
        return `Prev FY ${y}-${String(y + 1).slice(2)}`;
      }
      case "month_select": {
        const found = availableMonths.find((m) => m.value === selectedMonth);
        return found ? found.label : (availableMonths[0]?.label || "Selected Month");
      }
      case "custom":
        return startDate && endDate ? `${startDate} to ${endDate}` : "Custom Date Range";
      default:
        return "All Time";
    }
  };

  // Unassigned transactions for AI Assistant
  const unassigned = useMemo(() => {
    return annotatedTransactions.filter((t) => !t.party_name);
  }, [annotatedTransactions]);

  // Party counts for directory (assigned party names)
  const partyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    annotatedTransactions.forEach((t) => {
      if (t.party_name) {
        counts[t.party_name] = (counts[t.party_name] || 0) + 1;
      }
    });
    return counts;
  }, [annotatedTransactions]);

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16]">
      {/* Top Header */}
      <Header
        supabaseConnected={supabaseConnected}
        freeMB={storageStats.freeMB}
        totalMB={storageStats.totalMB}
        geminiRequestsLeft={geminiRequestsLeft}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-[1800px] w-full mx-auto px-4 lg:px-8 py-5 space-y-5">
        {/* Latest Recorded Dates in Database Banner */}
        {latestDatesPerBank.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-indigo-900/50 bg-indigo-950/20 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <span>📅</span>
                <span>Latest Recorded Dates in Database:</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {latestDatesPerBank.map((item) => (
                  <span
                    key={item.bank}
                    className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[11px]"
                  >
                    <strong className="text-slate-300 font-medium">{item.bank}:</strong>{" "}
                    <span className="font-mono text-indigo-400 font-semibold">{item.date}</span>
                  </span>
                ))}
              </div>
            </div>
            <span className="text-slate-500 italic text-[11px]">
              (upload statements from these dates onwards)
            </span>
          </div>
        )}

        {/* Statement Upload Dropzone */}
        <FileDropzone onStatementsParsed={handleStatementsParsed} />

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 space-x-2">
          <button
            onClick={() => setActiveTab("search")}
            className={`py-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "search"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Unified Transaction Search</span>
          </button>

          <button
            onClick={() => setActiveTab("cashflow")}
            className={`py-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "cashflow"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Monthly Profit & Cash Flow</span>
          </button>
        </div>

        {/* Tab 1: Unified Transaction Search */}
        {activeTab === "search" && (
          <div className="space-y-4">
            {/* Period & Filter Controls */}
            <FiltersBar
              period={period}
              onPeriodChange={setPeriod}
              availableMonths={availableMonths}
              selectedMonth={selectedMonth}
              onSelectedMonthChange={setSelectedMonth}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              sort={sortOrder}
              onSortChange={setSortOrder}
              excludeContra={excludeContra}
              onExcludeContraChange={setExcludeContra}
              excludeFD={excludeFD}
              onExcludeFDChange={setExcludeFD}
              activePeriodLabel={getPeriodLabel()}
              matchingCount={quickFinancials.transactionCount}
            />

            {/* Quick Cash Flow Ribbon */}
            <QuickCashflow
              totalInflow={quickFinancials.inflow}
              totalOutflow={quickFinancials.outflow}
              netProfit={quickFinancials.netProfit}
              excludedContraTotal={quickFinancials.contraTotal}
              excludedFDTotal={quickFinancials.fdTotal}
              periodLabel={getPeriodLabel()}
              transactionCount={quickFinancials.transactionCount}
            />

            {/* Bank Color Legend */}
            <BankLegend
              bankCounts={bankCounts}
              selectedBank={selectedBank}
              onSelectBank={setSelectedBank}
            />

            {/* AI Party Assistant Expander */}
            <AIPartyAssistant
              unassignedTransactions={unassigned}
              storedParties={storedParties}
              geminiRequestsLeft={geminiRequestsLeft}
              onApplySuggestions={handleApplyAISuggestions}
            />

            {/* Search Input Bar */}
            <SearchBar
              mode={searchMode}
              query={searchQuery}
              onModeChange={setSearchMode}
              onQueryChange={setSearchQuery}
              uniqueUTRs={uniqueUTRs}
              storedParties={storedParties}
            />

            {/* Transaction Data Table */}
            <TransactionTable
              transactions={filteredTransactions}
              onUpdatePartyName={handleUpdatePartyName}
              storedParties={storedParties}
            />
          </div>
        )}

        {/* Tab 2: Monthly Profit & Cash Flow */}
        {activeTab === "cashflow" && (
          <div className="space-y-5">
            {/* Period & Filter Controls (Available in Cash Flow Dashboard) */}
            <FiltersBar
              period={period}
              onPeriodChange={setPeriod}
              availableMonths={availableMonths}
              selectedMonth={selectedMonth}
              onSelectedMonthChange={setSelectedMonth}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              excludeContra={excludeContra}
              onExcludeContraChange={setExcludeContra}
              excludeFD={excludeFD}
              onExcludeFDChange={setExcludeFD}
              hideSort={true}
              activePeriodLabel={getPeriodLabel()}
              matchingCount={quickFinancials.transactionCount}
            />

            {/* 6 KPI Metric Cards */}
            <CashflowKPICards
              totalInflow={quickFinancials.inflow}
              totalOutflow={quickFinancials.outflow}
              netProfit={quickFinancials.netProfit}
              profitMargin={quickFinancials.profitMargin}
              totalFD={quickFinancials.fdTotal}
              totalContra={quickFinancials.contraTotal}
              periodLabel={getPeriodLabel()}
              transactionCount={quickFinancials.transactionCount}
            />

            {/* Inflows vs Outflows Recharts Bar Chart */}
            <MonthlyChart data={monthlyData} />

            {/* Month-by-month Table + 3-Sheet Excel Export */}
            <MonthlyTable data={monthlyData} allTransactions={periodFilteredTransactions} />
          </div>
        )}

        {/* Bottom Expanders: Capacity, Backup/Restore, Party Directory */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-900">
          <CapacityTracker stats={storageStats} onRefresh={loadData} />
          <BackupRestore onRestoreCompleted={loadData} />
          <PartyManager
            storedParties={storedParties}
            partyCounts={partyCounts}
            onAddParty={async (name) => {
              const clean = name.trim();
              if (!clean) return;
              setStoredParties((prev) => {
                const next = Array.from(new Set([...prev, clean])).sort((a, b) => a.localeCompare(b));
                try {
                  localStorage.setItem("stored_parties_directory", JSON.stringify(next));
                } catch (e) {}
                return next;
              });
              try {
                await fetch("/api/transactions/party", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ party_name: clean }),
                });
              } catch (e) {}
            }}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
