import { useState, useCallback } from "react";
import { db } from "../../db/index.js";
import { parseSMS, parseMultipleSMS } from "../../utils/smsParser.js";
import { categorize } from "../../utils/categorizer.js";
import { CATEGORIES } from "../../constants/categories.js";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Inbox,
  Loader2,
  ClipboardPaste,
  ShieldCheck,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true only when running inside the compiled Capacitor Android app.
 * Safe to call before Capacitor fully initialises.
 */
const isNative = () => window?.Capacitor?.isNativePlatform() === true;

/**
 * Normalise whatever parseSMS returns for `date` into a reliable ms timestamp.
 */
function toTimestamp(raw) {
  if (!raw) return Date.now();
  if (typeof raw === "number") return isNaN(raw) ? Date.now() : raw;
  if (/^\d{10,13}$/.test(String(raw).trim())) return Number(raw);
  const d = new Date(raw);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

/**
 * Read up to `maxCount` messages from the Android SMS inbox.
 */
async function readInboxSMS(maxCount = 300) {
  if (!isNative()) {
    throw new Error("Auto-import only works in the Android app, not the browser.");
  }

  let SMSInboxReader;
  try {
    ({ SMSInboxReader } = await import("capacitor-sms-inbox"));
    if (!SMSInboxReader) throw new Error("No plugin export found");
  } catch {
    throw new Error(
      "SMS plugin not found. Run: npm i capacitor-sms-inbox && npx cap sync android"
    );
  }

  let perm;
  try {
    perm = await SMSInboxReader.requestPermissions();
  } catch {
    throw new Error(
      "Could not request SMS permission. Check AndroidManifest.xml for READ_SMS."
    );
  }

  if (perm?.sms !== "granted") {
    throw new Error(
      "SMS permission denied. Allow it in Android Settings → Apps → SpendSense → Permissions."
    );
  }

  let result;
  try {
    result = await SMSInboxReader.getSMSList({
      filter: { type: 1, maxCount },
    });
  } catch (err) {
    throw new Error(`Failed to read SMS inbox: ${err?.message ?? "unknown error"}`);
  }

  const list = result?.smsList ?? [];
  if (!Array.isArray(list)) {
    throw new Error("Unexpected response format from SMS plugin.");
  }

  return list;
}

/**
 * Persist one parsed transaction. Returns false if it's a duplicate.
 */
async function saveTransaction(tx, note = "Imported from SMS") {
  const ts = toTimestamp(tx.date);

  const bucket = await db.transactions
    .where("date")
    .between(ts - 1000, ts + 1000, true, true)
    .toArray();

  const isDuplicate = bucket.some(
    (e) => e.amount === tx.amount && e.merchant === (tx.merchant || "Unknown")
  );
  if (isDuplicate) return false;

  const cat = categorize(tx.merchant ?? "", tx.amount, tx.date) || "";

  await db.transactions.add({
    amount:    tx.amount,
    merchant:  tx.merchant || "Unknown",
    category:  cat,
    source:    tx.upiId ? "UPI" : "Card",
    isDebit:   tx.isDebit,
    date:      ts,
    note,
    createdAt: Date.now(),
  });

  if (tx.merchant && cat) {
    await db.merchantMap.add({ pattern: tx.merchant, category: cat });
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status enum
// ─────────────────────────────────────────────────────────────────────────────

const STATUS = {
  IDLE:    "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR:   "error",
};

// Shared input/select/textarea className
const inputCls =
  "w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm border border-gray-300 dark:border-gray-700 outline-none focus:border-indigo-500 placeholder-gray-400 dark:placeholder-gray-600 transition-colors";

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SmsImport() {
  // ── Manual paste ──────────────────────────────────────────────────────────
  const [text,         setText]         = useState("");
  const [parsed,       setParsed]       = useState(null);
  const [category,     setCategory]     = useState("");
  const [manualStatus, setManualStatus] = useState(STATUS.IDLE);
  const [manualMsg,    setManualMsg]    = useState("");

  // ── Bulk / auto import ────────────────────────────────────────────────────
  const [bulkStatus,  setBulkStatus]  = useState(STATUS.IDLE);
  const [bulkMsg,     setBulkMsg]     = useState("");
  const [bulkResults, setBulkResults] = useState(null);

  // ── Single SMS parse ──────────────────────────────────────────────────────
  const handleParse = useCallback(() => {
    setManualStatus(STATUS.IDLE);
    setManualMsg("");
    setParsed(null);

    const raw = text.trim();
    if (!raw) return;

    const result = parseSMS(raw);
    if (!result) {
      setManualStatus(STATUS.ERROR);
      setManualMsg(
        "Couldn't recognise this as a bank SMS. Try a transaction message from HDFC, ICICI, SBI, Axis, Federal, or Kotak."
      );
      return;
    }

    const guessedCat = categorize(result.merchant ?? "", result.amount, result.date) || "";
    setCategory(guessedCat);
    setParsed(result);
  }, [text]);

  const handleSave = useCallback(async () => {
    if (!parsed) return;
    try {
      const ts  = toTimestamp(parsed.date);
      const cat = category || "";

      await db.transactions.add({
        amount:    parsed.amount,
        merchant:  parsed.merchant || "Unknown",
        category:  cat,
        source:    parsed.upiId ? "UPI" : "Card",
        isDebit:   parsed.isDebit,
        date:      ts,
        note:      "Manually imported from SMS",
        createdAt: Date.now(),
      });

      if (parsed.merchant && cat) {
        await db.merchantMap.add({ pattern: parsed.merchant, category: cat });
      }

      setManualStatus(STATUS.SUCCESS);
      setManualMsg("Transaction saved!");
      setText("");
      setParsed(null);
      setCategory("");
    } catch (err) {
      setManualStatus(STATUS.ERROR);
      setManualMsg(`Save failed: ${err?.message ?? "unknown error"}`);
    }
  }, [parsed, category]);

  // ── Bulk import ───────────────────────────────────────────────────────────
  const handleAutoImport = useCallback(async () => {
    setBulkStatus(STATUS.LOADING);
    setBulkMsg("");
    setBulkResults(null);

    let smsList;
    try {
      smsList = await readInboxSMS(300);
    } catch (err) {
      setBulkStatus(STATUS.ERROR);
      setBulkMsg(err.message);
      return;
    }

    if (smsList.length === 0) {
      setBulkStatus(STATUS.ERROR);
      setBulkMsg("No SMS messages found in the inbox.");
      return;
    }

    const bodies       = smsList.map((s) => s.body || s.message || "").filter(Boolean);
    const transactions = parseMultipleSMS(bodies);

    if (transactions.length === 0) {
      setBulkStatus(STATUS.ERROR);
      setBulkMsg(
        `Read ${smsList.length} messages but found no bank transactions. Make sure you have transaction SMS from a supported bank.`
      );
      return;
    }

    let savedCount = 0, skippedCount = 0, errorCount = 0;

    for (const tx of transactions) {
      if (tx.needsReview === true || tx.confidenceScore < 70) {
        skippedCount++;
        continue;
      }
      try {
        const wasSaved = await saveTransaction(tx, "Auto-imported from SMS inbox");
        if (wasSaved) savedCount++;
        else skippedCount++;
      } catch {
        errorCount++;
      }
    }

    setBulkResults({ saved: savedCount, skipped: skippedCount, errors: errorCount });
    setBulkStatus(STATUS.SUCCESS);
    setBulkMsg(
      `Done! ${savedCount} saved, ${skippedCount} duplicate${skippedCount !== 1 ? "s" : ""} skipped${errorCount ? `, ${errorCount} errors` : ""}.`
    );
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Import</h2>
        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-400/10 border border-green-200 dark:border-green-400/20 rounded-full px-2 py-0.5">
          <ShieldCheck size={11} />
          stays on device
        </span>
      </div>

      {/* ── Auto import ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div>
          <h3 className="text-gray-900 dark:text-white font-semibold text-sm">Auto Import from Inbox</h3>
          <p className="text-gray-500 text-xs mt-1">
            Reads your SMS inbox and imports all bank transactions in one tap.
            Android app only — nothing leaves your device.
          </p>
        </div>

        <button
          onClick={handleAutoImport}
          disabled={bulkStatus === STATUS.LOADING}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium transition-colors"
        >
          {bulkStatus === STATUS.LOADING ? (
            <><Loader2 size={16} className="animate-spin" /> Reading inbox…</>
          ) : (
            <><Inbox size={16} /> Import from SMS Inbox</>
          )}
        </button>

        {bulkStatus === STATUS.SUCCESS && bulkResults && (
          <div className="bg-green-50 dark:bg-green-400/10 border border-green-200 dark:border-green-400/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
              <CheckCircle size={16} />
              {bulkMsg}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Saved"   value={bulkResults.saved}   color="text-green-600 dark:text-green-400"  />
              <Stat label="Skipped" value={bulkResults.skipped} color="text-yellow-600 dark:text-yellow-400" />
              <Stat label="Errors"  value={bulkResults.errors}  color="text-red-600 dark:text-red-400"    />
            </div>
          </div>
        )}

        {bulkStatus === STATUS.ERROR && <ErrorBanner message={bulkMsg} />}
      </div>

      {/* ── Manual paste ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div>
          <h3 className="text-gray-900 dark:text-white font-semibold text-sm flex items-center gap-2">
            <ClipboardPaste size={15} className="text-indigo-600 dark:text-indigo-400" />
            Paste a Single SMS
          </h3>
          <p className="text-gray-500 text-xs mt-1">
            Paste any bank transaction SMS and review it before saving.
          </p>
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setManualStatus(STATUS.IDLE);
            setParsed(null);
          }}
          placeholder="Paste your bank transaction SMS here…"
          rows={4}
          className={`${inputCls} resize-none`}
        />

        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium transition-colors"
        >
          Parse SMS
        </button>
      </div>

      {manualStatus === STATUS.ERROR && !parsed && (
        <ErrorBanner message={manualMsg} />
      )}

      {/* ── Review card ───────────────────────────────────────────────── */}
      {parsed && manualStatus !== STATUS.SUCCESS && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
          <h3 className="text-gray-900 dark:text-white font-semibold text-sm flex items-center gap-2">
            <AlertCircle size={16} className="text-yellow-500 dark:text-yellow-400" />
            Review &amp; Confirm
          </h3>

          {parsed.isLowConfidence && (
            <div className="bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/20 text-yellow-700 dark:text-yellow-400 rounded-lg p-3 text-xs leading-relaxed">
              ⚠️ <strong>Low Confidence Parse:</strong> We could not parse this message with high certainty. Please double check the details below.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoCell label="Amount"   value={`₹${parsed.amount.toLocaleString("en-IN")}`} />
            <InfoCell
              label="Type"
              value={parsed.isDebit ? "Expense" : "Income"}
              valueClass={parsed.isDebit ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"}
            />
            <InfoCell label="Merchant" value={parsed.merchant || "Unknown"} />
            <InfoCell
              label="Date"
              value={
                parsed.date
                  ? new Date(toTimestamp(parsed.date)).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })
                  : "Today"
              }
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-gray-500 dark:text-gray-400 text-xs">Category</p>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
            >
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Save Transaction
          </button>

          {manualStatus === STATUS.ERROR && <ErrorBanner message={manualMsg} />}
        </div>
      )}

      {manualStatus === STATUS.SUCCESS && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-400/10 border border-green-200 dark:border-green-400/20 rounded-xl p-4">
          <CheckCircle size={18} />
          <p className="text-sm font-medium">{manualMsg}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10 border border-red-200 dark:border-red-400/20 rounded-xl p-4">
      <XCircle size={18} className="mt-0.5 shrink-0" />
      <p className="text-sm leading-relaxed">{message}</p>
    </div>
  );
}

function InfoCell({ label, value, valueClass = "text-gray-900 dark:text-white" }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`font-semibold text-sm ${valueClass}`}>{value}</p>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800/60 rounded-lg p-2 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
}