"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatINR } from "@/lib/formatters/currency";
import { Card, CardHeader, CardTitle } from "../ui/card";

export interface MonthlyDataPoint {
  month: string;
  inflow: number;
  outflow: number;
  netProfit: number;
  fd: number;
  contra: number;
  transactionsCount: number;
}

interface MonthlyChartProps {
  data: MonthlyDataPoint[];
}

// B9 fix: CustomTooltip defined at module scope to avoid unmount/remount flicker on parent re-renders
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-semibold text-slate-200 border-b border-slate-800 pb-1">{label}</p>
        <div className="space-y-1 font-mono">
          <p className="text-emerald-400 flex items-center justify-between gap-4">
            <span>Received:</span>
            <span>{formatINR(payload[0]?.value)}</span>
          </p>
          <p className="text-rose-400 flex items-center justify-between gap-4">
            <span>Sent:</span>
            <span>{formatINR(payload[1]?.value)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function MonthlyChart({ data }: MonthlyChartProps) {
  if (data.length === 0) {
    return (
      <Card className="p-8 text-center text-xs text-slate-500">
        No monthly cash flow data available.
      </Card>
    );
  }

  return (
    <Card className="p-4 border-slate-800 bg-slate-900/60">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-sm font-semibold text-slate-200 flex items-center justify-between">
          <span>Monthly Cash Flow: Inflows vs Outflows</span>
          <span className="text-xs text-slate-400 font-normal">
            Grouped chronologically (₹ Indian Rupees)
          </span>
        </CardTitle>
      </CardHeader>
      <div className="h-72 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
              formatter={(value) => {
                if (value === "inflow") return <span className="text-emerald-400 font-medium">Business Received</span>;
                if (value === "outflow") return <span className="text-rose-400 font-medium">Business Sent</span>;
                return value;
              }}
            />
            <Bar
              dataKey="inflow"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              name="inflow"
            />
            <Bar
              dataKey="outflow"
              fill="#f43f5e"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              name="outflow"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
