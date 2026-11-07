"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, Check, CheckSquare, Square, AlertCircle, ArrowRight, Loader2, Cpu } from "lucide-react";
import { Transaction } from "@/types/transaction";
import { PartySuggestion } from "@/lib/ai/party-suggestions";
import { formatINR } from "@/lib/formatters/currency";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

interface AIPartyAssistantProps {
  unassignedTransactions: Transaction[];
  storedParties: string[];
  geminiRequestsLeft: number;
  apiKey?: string;
  onApplySuggestions: (
    approved: { fingerprint: string; matchKey: string; partyName: string }[]
  ) => Promise<void>;
}

export function AIPartyAssistant({
  unassignedTransactions,
  storedParties,
  geminiRequestsLeft,
  apiKey,
  onApplySuggestions,
}: AIPartyAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [batchSize, setBatchSize] = useState(30);
  const [skipContraFD, setSkipContraFD] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PartySuggestion[]>([]);
  const [selectedFingerprints, setSelectedFingerprints] = useState<Set<string>>(new Set());
  const [customApiKey, setCustomApiKey] = useState(apiKey || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic model discovery & fallback
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [preferredModel, setPreferredModel] = useState<string>("auto");
  const [modelUsed, setModelUsed] = useState<string | null>(null);

  const txnMap = useMemo(() => {
    const map = new Map<string, Transaction>();
    unassignedTransactions.forEach((t) => map.set(t.fingerprint, t));
    return map;
  }, [unassignedTransactions]);

  // Fetch available models from Gemini API
  useEffect(() => {
    if (isOpen) {
      fetch("/api/ai/models")
        .then((res) => res.json())
        .then((data) => {
          if (data.models && Array.isArray(data.models)) {
            setAvailableModels(data.models.map((m: any) => m.id));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Filter candidate transactions
  const candidates = useMemo(() => {
    return unassignedTransactions.filter((t) => {
      if (!t.party_name) {
        if (skipContraFD && (t.is_self_transfer || t.is_fd_investment || t.is_insurance_claim)) return false;
        return true;
      }
      return false;
    });
  }, [unassignedTransactions, skipContraFD]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setModelUsed(null);

    const batch = candidates.slice(0, batchSize);

    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: batch,
          storedParties,
          apiKey: customApiKey || undefined,
          preferredModel: preferredModel !== "auto" ? preferredModel : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server responded with ${res.status}: ${res.statusText}`);
      }

      const returnedSuggestions: PartySuggestion[] = data.suggestions || [];
      setSuggestions(returnedSuggestions);
      if (data.modelUsed) {
        setModelUsed(data.modelUsed);
      }

      // Pre-select High and Medium confidence suggestions
      const preSelected = new Set<string>();
      returnedSuggestions.forEach((s) => {
        if (s.suggested_party && (s.confidence === "High" || s.confidence === "Medium")) {
          preSelected.add(s.fingerprint);
        }
      });
      setSelectedFingerprints(preSelected);
    } catch (err: any) {
      console.error("AI suggest error:", err);
      const msg =
        err.message === "Failed to fetch"
          ? "Network error or local server not responding. Please check your connection."
          : err.message || "Failed to contact Gemini API";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedFingerprints.size === suggestions.length) {
      setSelectedFingerprints(new Set());
    } else {
      setSelectedFingerprints(new Set(suggestions.map((s) => s.fingerprint)));
    }
  };

  const toggleSelectOne = (fingerprint: string) => {
    const next = new Set(selectedFingerprints);
    if (next.has(fingerprint)) next.delete(fingerprint);
    else next.add(fingerprint);
    setSelectedFingerprints(next);
  };

  const handleApply = async () => {
    const approved: { fingerprint: string; matchKey: string; partyName: string }[] = [];

    suggestions.forEach((s) => {
      if (selectedFingerprints.has(s.fingerprint) && s.suggested_party) {
        const txn = unassignedTransactions.find((t) => t.fingerprint === s.fingerprint);
        if (txn) {
          approved.push({
            fingerprint: s.fingerprint,
            matchKey: txn.party_match_key,
            partyName: s.suggested_party,
          });
        }
      }
    });

    if (approved.length > 0) {
      setIsLoading(true);
      await onApplySuggestions(approved);
      setIsLoading(false);
      setSuggestions([]);
      setSelectedFingerprints(new Set());
    }
  };

  return (
    <Card className="p-4 border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-slate-900/60 to-slate-900/90 shadow-md">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">AI Party Name Assistant</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                Google Gemini
              </span>
              {modelUsed && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  <span>{modelUsed}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {candidates.length} unassigned transactions available for AI auto-tagging.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 gap-1.5 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
        >
          <span>{isOpen ? "Hide Assistant" : "Open Assistant"}</span>
        </Button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
          {/* Controls: Batch size, skip contra, Model selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Batch Size */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">
                Batch Size: <span className="text-slate-200 font-mono">{batchSize} txns</span>
              </label>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* 2. Skip Contra / FD */}
            <div className="flex items-center gap-2 pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={skipContraFD}
                  onChange={(e) => setSkipContraFD(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Skip Self-Transfers & Fixed Deposits</span>
              </label>
            </div>

            {/* 3. Gemini Model Selector with Auto-Fallback */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center gap-1">
                <Cpu className="h-3 w-3 text-indigo-400" />
                <span>Gemini Model:</span>
              </label>
              <select
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="auto">⚡ Auto-Select (Cascading Fallback)</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Action button */}
            <div className="flex items-center justify-end pt-3">
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerate}
                disabled={isLoading || candidates.length === 0}
                className="h-9 px-4 gap-2 text-xs w-full sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>Generate AI Suggestions</span>
              </Button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Suggestions Table */}
          {suggestions.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    {selectedFingerprints.size === suggestions.length ? (
                      <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {selectedFingerprints.size === suggestions.length
                        ? "Deselect All"
                        : "Select All"}
                    </span>
                  </Button>
                  <span className="text-slate-400">
                    ({selectedFingerprints.size} of {suggestions.length} selected)
                  </span>
                  {modelUsed && (
                    <span className="text-slate-400 text-[11px] ml-2">
                      Generated via <span className="text-emerald-400 font-mono">{modelUsed}</span>
                    </span>
                  )}
                </div>

                <Button
                  variant="success"
                  size="sm"
                  onClick={handleApply}
                  disabled={selectedFingerprints.size === 0 || isLoading}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Apply {selectedFingerprints.size} Approved Suggestions</span>
                </Button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Approve</th>
                      <th className="py-2.5 px-3 w-28">Date & Bank</th>
                      <th className="py-2.5 px-3 w-28 text-right">Amount</th>
                      <th className="py-2.5 px-3 min-w-[220px]">Original Statement Narration</th>
                      <th className="py-2.5 px-3">Suggested Party Name</th>
                      <th className="py-2.5 px-3 w-28">Confidence</th>
                      <th className="py-2.5 px-3 min-w-[200px]">AI Reasoning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {suggestions.map((item) => {
                      const isSelected = selectedFingerprints.has(item.fingerprint);
                      const txn = txnMap.get(item.fingerprint);

                      return (
                        <tr
                          key={item.fingerprint}
                          className={`hover:bg-slate-900/60 transition-colors ${
                            isSelected ? "bg-indigo-950/25" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(item.fingerprint)}
                              disabled={!item.suggested_party}
                              className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-medium text-slate-200">{txn?.date || "—"}</div>
                            <div className="text-[10px] text-slate-500">{txn?.bank || "—"}</div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-right">
                            <div
                              className={`font-mono font-semibold ${
                                txn?.type === "Credit" ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {txn?.amount !== undefined ? formatINR(txn.amount) : "—"}
                            </div>
                            <span className="text-[10px] text-slate-500">{txn?.type}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] max-w-xs break-all">
                            {txn?.description || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100">
                            {item.suggested_party ? (
                              <span className="text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                {item.suggested_party}
                              </span>
                            ) : (
                              <span className="text-slate-600 italic">No confident match</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                item.confidence === "High"
                                  ? "success"
                                  : item.confidence === "Medium"
                                  ? "warning"
                                  : "danger"
                              }
                              className="text-[10px] py-0.5 px-2"
                            >
                              {item.confidence === "High"
                                ? "🟢 High"
                                : item.confidence === "Medium"
                                ? "🟡 Medium"
                                : "🔴 Low"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {item.reason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
