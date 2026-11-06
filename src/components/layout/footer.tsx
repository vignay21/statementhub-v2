import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
      <div className="max-w-[1800px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>StatementHub v2 — Client-side bank processing with persistent Supabase storage.</p>
        <p>Statements processed privately in your browser.</p>
      </div>
    </footer>
  );
}
