"use client";

import React, { useState, useMemo } from "react";
import { Users, Plus, Search, Sparkles } from "lucide-react";
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
  const [searchFilter, setSearchFilter] = useState("");
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

  const filteredParties = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return storedParties;
    return storedParties.filter((p) => p.toLowerCase().includes(q));
  }, [storedParties, searchFilter]);

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

      <p className="text-xs text-slate-400">
        Authorized directory of registered counterparty names. Only these are suggested when assigning party names. Type a new name to add it to this directory.
      </p>

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

          {/* Search inside directory if more than 5 parties */}
          {storedParties.length > 5 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search registered parties..."
                className="h-8 pl-8 text-xs bg-slate-950 border-slate-800"
              />
            </div>
          )}

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
                {filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-4 px-3 text-center text-slate-500 italic">
                      {storedParties.length === 0
                        ? "No registered party names yet. Type a name above to add, or upload statements with detected narrations."
                        : "No parties match your search filter."}
                    </td>
                  </tr>
                ) : (
                  filteredParties.map((p) => (
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
