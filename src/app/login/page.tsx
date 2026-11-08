"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, Lock, KeyRound, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTarget = searchParams.get("from") || "/";
  // S6 fix: Ensure redirect target is same-origin relative path and not protocol-relative
  const redirectTarget =
    rawTarget.startsWith("/") && !rawTarget.startsWith("//") && !rawTarget.includes(":")
      ? rawTarget
      : "/";

  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter the passcode.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Incorrect passcode. Please try again.");
        setIsLoading(false);
        return;
      }

      // Successful verification
      router.push(redirectTarget);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-1">
          <Layers className="h-7 w-7" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">StatementHub</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            v2.0
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Enter the authorized access passcode to view financial statements & analytics.
        </p>
      </div>

      {/* Lock Notice */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300">
        <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
        <span>Private Portal • Authorized Personnel Only</span>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
            <span>Application Passcode</span>
          </label>
          <div className="relative">
            <Input
              type={showCode ? "text" : "password"}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter passcode..."
              autoFocus
              disabled={isLoading}
              className="h-11 pl-3.5 pr-10 bg-slate-950/80 border-slate-700 text-sm text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 rounded-xl font-mono"
            />
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
              tabIndex={-1}
            >
              {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !code.trim()}
          className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 gap-2 transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying Passcode...</span>
            </>
          ) : (
            <>
              <span>Unlock Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-[11px] text-slate-500">
          Secured with encrypted 30-day session authorization.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]">
      <Suspense fallback={<div className="text-slate-400 text-xs">Loading portal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
