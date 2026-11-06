"use client";

import React, { useState } from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface PartyManagerProps {
  storedParties: string[];
  partyCounts: Record<string, number>;
  onAddParty: (name: string) => Promise<void>;
}

export function PartyManager({ storedParties, partyCounts, onAddParty }: PartyManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPartyInput, setNewPartyInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPartyInput.trim();
    if (!name) return;

    setIsSubmitting(true);
    try {
      await onAddParty(name);
      setNewPartyInput("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 border-slate-800 bg-slate-900/40 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-400" />
          <h4 className="text-xs font-semibold text-slate-200">
            Stored Party Names Directory ({storedParties.length})
          </h4>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-7 px-2.5 text-xs"
        >
          {isOpen ? "Close Directory" : "Manage Directory"}
        </Button>
      </div>

      {isOpen && (
        <div className="space-y-3 pt-2">
          {/* Add form */}
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <Input
              type="text"
              value={newPartyInput}
              onChange={(e) => setNewPartyInput(e.target.value)}
              placeholder="Add new counterparty name (e.g. VENKATESHWARA TRADERS)"
              className="h-9 text-xs"
            />
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting || !newPartyInput.trim()}
              className="h-9 px-3 gap-1.5 text-xs shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </Button>
          </form>

          {/* List */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Party Name</th>
                  <th className="py-2 px-3 text-right">Transactions Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {storedParties.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-4 px-3 text-center text-slate-500 italic">
                      No registered party names yet. Type a name above to add, or assign names to transactions.
                    </td>
                  </tr>
                ) : (
                  storedParties.map((p) => (
                    <tr key={p} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-200">{p}</td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        {partyCounts[p] || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
