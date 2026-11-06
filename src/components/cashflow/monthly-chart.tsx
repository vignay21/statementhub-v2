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

export function MonthlyChart({ data }: MonthlyChartProps) {
  if (data.length === 0) {
    return (
      <Card className="p-8 text-center text-xs text-slate-500">
        No monthly cash flow data available.
      </Card>
    );
  }

  // Custom tooltip formatter
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

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="month"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-slate-300 font-medium">{value}</span>
              )}
            />
            <Bar
              dataKey="inflow"
              name="Business Received (Inflows)"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="outflow"
              name="Business Sent (Outflows)"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
