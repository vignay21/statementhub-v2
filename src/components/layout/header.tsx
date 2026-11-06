"use client";

import React from "react";
import { Database, Sparkles, RefreshCw, Layers } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface HeaderProps {
  supabaseConnected: boolean;
  freeMB: number;
  totalMB: number;
  geminiRequestsLeft: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({
  supabaseConnected,
  freeMB,
  totalMB,
  geminiRequestsLeft,
  onRefresh,
  isRefreshing,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Title & Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">StatementHub</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              High-Speed Bank Statement Search & Cash Flow Analytics
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {/* Supabase Status */}
          <Badge
            variant={supabaseConnected ? "success" : "warning"}
            className="flex items-center gap-1.5 py-1 px-3"
          >
            <Database className="h-3 w-3" />
            <span>
              {supabaseConnected
                ? `🟢 Supabase (${freeMB} MB Free / ${totalMB} MB)`
                : "🟡 Local Memory Mode"}
            </span>
          </Badge>

          {/* Gemini AI Quota */}
          <Badge variant="default" className="flex items-center gap-1.5 py-1 px-3">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>Gemini: {geminiRequestsLeft} req left</span>
          </Badge>

          {/* Refresh button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
