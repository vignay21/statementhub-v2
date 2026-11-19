"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lock, KeyRound, X, Check, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface PrivacyPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STORAGE_KEY = "statementhub_financials_pin";
const DEFAULT_PIN = "1234";

export function PrivacyPinModal({ isOpen, onClose, onSuccess }: PrivacyPinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [showDigits, setShowDigits] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      setIsChangingPin(false);
      setCurrentPinInput("");
      setNewPinInput("");
      setConfirmPinInput("");
      setChangeSuccess(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStoredPin = (): string => {
    if (typeof window === "undefined") return DEFAULT_PIN;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_PIN;
  };

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const storedPin = getStoredPin();

    if (pin.trim() === storedPin) {
      setError("");
      setPin("");
      onSuccess();
      onClose();
    } else {
      setError("Incorrect PIN. Please try again.");
      setPin("");
      inputRef.current?.focus();
    }
  };

  const handlePinChange = (val: string) => {
    // Only accept numeric input, max 6 digits (standard 4 digits)
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    setPin(cleaned);
    setError("");

    // Auto-submit if reaches standard 4 digits
    const storedPin = getStoredPin();
    if (cleaned.length === storedPin.length && cleaned.length >= 4) {
      if (cleaned === storedPin) {
        setError("");
        setPin("");
        onSuccess();
        onClose();
      } else {
        setError("Incorrect PIN. Please try again.");
        setPin("");
      }
    }
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = getStoredPin();

    if (currentPinInput.trim() !== storedPin) {
      setError("Current PIN is incorrect.");
      return;
    }

    if (newPinInput.length < 4) {
      setError("New PIN must be at least 4 digits.");
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setError("New PIN and confirmation do not match.");
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, newPinInput.trim());
      setChangeSuccess(true);
      setError("");
      setTimeout(() => {
        setIsChangingPin(false);
        setChangeSuccess(false);
        setCurrentPinInput("");
        setNewPinInput("");
        setConfirmPinInput("");
      }, 1500);
    } catch {
      setError("Failed to save PIN in browser storage.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl text-slate-100 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-900 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {!isChangingPin ? (
          /* Normal Unlock Mode */
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-100">Confidential Financials</h3>
              <p className="text-xs text-slate-400 max-w-[240px]">
                Enter your 4-digit PIN to display profit and cash flow figures.
              </p>
            </div>

            {/* PIN Input with eye visibility toggle */}
            <div className="space-y-2">
              <div className="relative">
                <Input
                  ref={inputRef}
                  type={showDigits ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••"
                  autoComplete="off"
                  className="h-12 text-center text-2xl font-mono tracking-[0.4em] bg-slate-900 border-slate-800 focus:border-indigo-500 rounded-xl"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowDigits((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                  aria-label={showDigits ? "Hide PIN" : "Show PIN"}
                >
                  {showDigits ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-rose-400 text-center font-medium animate-in fade-in">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="w-1/2 h-9 text-xs border-slate-800 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="w-1/2 h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                Unlock
              </Button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPin(true);
                  setError("");
                }}
                className="text-[11px] text-slate-500 hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
              >
                <KeyRound className="h-3 w-3" />
                <span>Change PIN (Default: 1234)</span>
              </button>
            </div>
          </form>
        ) : (
          /* Change PIN Mode */
          <form onSubmit={handleChangePinSubmit} className="space-y-3.5">
            <div className="flex flex-col items-center text-center space-y-1.5">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <KeyRound className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100">Set New PIN</h3>
              <p className="text-[11px] text-slate-400">Update your 4-digit privacy PIN</p>
            </div>

            {changeSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center text-emerald-400 space-y-2">
                <ShieldCheck className="h-8 w-8" />
                <span className="text-xs font-semibold">PIN Changed Successfully!</span>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400">Current PIN</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter current PIN"
                      className="h-8 text-xs font-mono bg-slate-900 border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400">New 4-Digit PIN</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="e.g. 5678"
                      className="h-8 text-xs font-mono bg-slate-900 border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400">Confirm New PIN</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Re-enter new PIN"
                      className="h-8 text-xs font-mono bg-slate-900 border-slate-800"
                    />
                  </div>

                  {error && (
                    <p className="text-[11px] text-rose-400 font-medium">{error}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsChangingPin(false);
                      setError("");
                    }}
                    className="w-1/2 h-8 text-xs border-slate-800 text-slate-400"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="w-1/2 h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                  >
                    Save PIN
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
