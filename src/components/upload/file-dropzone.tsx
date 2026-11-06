"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseMultipleStatements } from "@/lib/parsers";
import { ImportedStatement } from "@/types/statement";
import { Button } from "../ui/button";

interface FileDropzoneProps {
  onStatementsParsed: (statements: ImportedStatement[]) => void;
  isProcessing?: boolean;
}

export function FileDropzone({ onStatementsParsed, isProcessing }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    setParseStatus(`Parsing ${files.length} statement file(s) in browser...`);
    setErrors([]);

    try {
      const result = await parseMultipleStatements(files);
      if (result.errors.length > 0) {
        setErrors(result.errors);
      }

      if (result.statements.length > 0) {
        setParseStatus(
          `Successfully parsed ${result.statements.length} file(s) with ${result.totalTransactions} transactions.`
        );
        onStatementsParsed(result.statements);
      } else {
        setParseStatus(null);
      }
    } catch (err: any) {
      setErrors([err.message || "Failed to parse files"]);
      setParseStatus(null);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10 scale-[1.005]"
            : "border-slate-700 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xls,.xlsx,.json"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
            <UploadCloud className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-200">
              Drag & drop bank statements here, or <span className="text-indigo-400">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports CSV, XLS, XLSX, and JSON backups from HDFC, Canara, ICICI, SBI, Axis, and Kotak.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Overlapping daily uploads are auto-deduplicated
            </span>
          </div>
        </div>
      </div>

      {/* Status & Error Messages */}
      {parseStatus && (
        <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{parseStatus}</span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-1 text-xs text-rose-300">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Parsing Warnings:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
