"use client";

import React, { useState } from "react";
import { Database, RefreshCw, HardDrive, ShieldCheck } from "lucide-react";
import { StorageStats } from "@/lib/supabase/storage-stats";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";

interface CapacityTrackerProps {
  stats: StorageStats;
  onRefresh: () => Promise<void>;
}

export function CapacityTracker({ stats, onRefresh }: CapacityTrackerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className="p-4 border-slate-800 bg-slate-900/40 space-y-3.5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-indigo-400" />
          <h4 className="text-xs font-semibold text-slate-200">
            Database Storage & Capacity Tracker (500 MB Free Tier)
          </h4>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-7 px-2.5 text-xs gap-1.5"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh Live Storage</span>
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>{stats.usedMB} MB used</span>
          <span>{stats.freeMB} MB free / {stats.totalMB} MB quota</span>
        </div>
        <Progress value={stats.usedPercentage} className="h-2.5" />
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center">
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <p className="text-[11px] text-slate-400">Storage Used</p>
          <p className="text-sm font-bold font-mono text-slate-200 mt-0.5">{stats.usedMB} MB</p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <p className="text-[11px] text-slate-400">Free Space</p>
          <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">{stats.freeMB} MB</p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <p className="text-[11px] text-slate-400">Total Saved Txns</p>
          <p className="text-sm font-bold font-mono text-indigo-400 mt-0.5">
            {stats.totalRecords.toLocaleString()}
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <p className="text-[11px] text-slate-400">Est. Headroom</p>
          <p className="text-sm font-bold font-mono text-slate-300 mt-0.5">
            ~{stats.remainingCapacity.toLocaleString()} txns
          </p>
        </div>
      </div>
    </Card>
  );
}
