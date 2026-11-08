"use client";

import React, { useRef, useState } from "react";
import { Download, Upload, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

interface BackupRestoreProps {
  onRestoreCompleted: () => Promise<void>;
}

export function BackupRestore({ onRestoreCompleted }: BackupRestoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleExport = () => {
    window.location.href = "/api/backup/export";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setMessage("Restoring and deduplicating backup...");
    setIsError(false);

    try {
      const text = await file.text();
      // B6 fix: Send raw text payload directly instead of parsing and re-stringifying
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to restore backup");
      }

      setMessage(
        `Successfully restored ${data.restoredParties} party names and ${data.transactionsResult?.inserted || 0} transactions.`
      );
      await onRestoreCompleted();
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message || "Failed to import backup");
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="p-4 border-slate-800 bg-slate-900/40 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <h4 className="text-xs font-semibold text-slate-200">
          Backup & Restore Center (Full JSON Snapshot)
        </h4>
      </div>

      <p className="text-xs text-slate-400">
        Export a complete snapshot of all historical bank transactions, counterparty mappings, and
        assigned labels to a portable JSON file.
      </p>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="h-8 gap-1.5 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Full JSON Backup</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isRestoring}
          className="h-8 gap-1.5 text-xs"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Restore from Backup File</span>
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {message && (
        <div
          className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
            isError
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          {isError ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}
    </Card>
  );
}
