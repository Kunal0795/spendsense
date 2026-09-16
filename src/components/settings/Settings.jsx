import { useState } from "react";
import { useApp } from "../../contexts/AppContext.jsx";
import { db } from "../../db/index.js";
import { Sun, Moon, Coins, Trash2, ShieldCheck, AlertTriangle, CheckCircle, Lock } from "lucide-react";
import PageTransition from "../shared/PageTransition.jsx";
import { usePrivateMode } from "../../hooks/usePrivateMode.js";

// ─── config ───────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
];

// ─── small reusable components ────────────────────────────────────────────────
function Section({ title, icon, children }) {
  const Icon = icon;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
      <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2 text-sm">
        <Icon size={16} className="text-indigo-600 dark:text-indigo-400" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function OptionButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function Settings() {
  const { theme, setTheme, currency, setCurrency } = useApp();
  const { isPrivate, togglePrivate } = usePrivateMode();

  const [confirmClear, setConfirmClear]   = useState(false);
  const [clearSuccess, setClearSuccess]   = useState(false);
  const [clearLoading, setClearLoading]   = useState(false);

  // ── danger zone: clear all data ──────────────────────────────────────────
  async function handleClearAll() {
    setClearLoading(true);
    try {
      await Promise.all([
        db.transactions.clear(),
        db.budgets.clear(),
        db.subscriptions.clear(),
        db.merchantMap.clear(),
        // Keep settings — user doesn't want to lose theme/currency prefs
      ]);
      setClearSuccess(true);
      setConfirmClear(false);
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (err) {
      console.error("Clear failed:", err);
    } finally {
      setClearLoading(false);
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>

      {/* ── Appearance ─────────────────────────────────────────────────── */}
      <Section title="Appearance" icon={theme === "dark" ? Moon : Sun}>
        <p className="text-gray-500 dark:text-gray-400 text-xs">Choose how SpendSense looks on your device.</p>
        <div className="flex gap-2">
          <OptionButton active={theme === "dark"}  onClick={() => setTheme("dark")}>
            <span className="flex items-center justify-center gap-1.5">
              <Moon size={14} /> Dark
            </span>
          </OptionButton>
          <OptionButton active={theme === "light"} onClick={() => setTheme("light")}>
            <span className="flex items-center justify-center gap-1.5">
              <Sun size={14} /> Light
            </span>
          </OptionButton>
        </div>
      </Section>

      {/* ── Currency ────────────────────────────────────────────────────── */}
      <Section title="Currency" icon={Coins}>
        <p className="text-gray-500 dark:text-gray-400 text-xs">
          Sets the symbol shown across the app. Does not convert existing amounts.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setCurrency(c.code)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                currency === c.code
                  ? "border-indigo-500 bg-indigo-600/10 text-indigo-700 dark:text-white"
                  : "border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="text-base w-6 text-center">{c.symbol}</span>
              <span>
                <span className="font-medium text-gray-900 dark:text-white">{c.code}</span>
                <span className="text-gray-500 text-xs ml-1">{c.label}</span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Privacy notice ──────────────────────────────────────────────── */}
      <Section title="Privacy & Security" icon={ShieldCheck}>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isPrivate ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
              <Lock size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Private Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Obscure all rupee amounts</p>
            </div>
          </div>
          <button
            onClick={togglePrivate}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPrivate ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPrivate ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </div>

        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mt-2">
          <p>
            <span className="text-green-600 dark:text-green-400 font-medium">100% offline.</span>{" "}
            SpendSense stores everything — transactions, budgets, SMS data — only
            on this device using your browser's IndexedDB.
          </p>
          <p>No account. No server. No data ever leaves your device.</p>
        </div>
      </Section>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <Section title="Danger Zone" icon={Trash2}>
        <p className="text-gray-500 dark:text-gray-400 text-xs">
          Permanently deletes all transactions, budgets, subscriptions and merchant
          mappings. Your theme and currency preference will be kept.
        </p>

        {/* success banner */}
        {clearSuccess && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-400/10 border border-green-200 dark:border-green-400/20 rounded-lg p-3 text-sm">
            <CheckCircle size={16} />
            All data cleared successfully.
          </div>
        )}

        {/* confirmation step */}
        {!confirmClear ? (
          <button
            onClick={() => setConfirmClear(true)}
            className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={15} />
            Clear All Data
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/20 rounded-lg p-3 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>This cannot be undone. Are you absolutely sure?</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearLoading}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {clearLoading ? "Clearing…" : "Yes, delete everything"}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ── App info ────────────────────────────────────────────────────── */}
      <div className="text-center text-gray-400 dark:text-gray-600 text-xs pb-4">
        SpendSense · Built by you · Fully private
      </div>
      </div>
    </PageTransition>
  );
}
