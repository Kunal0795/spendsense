import { useState } from "react";
import { db } from "../../db/index.js";
import { parseSMS } from "../../utils/smsParser.js";
import { categorize } from "../../utils/categorizer.js";
import { CAT_MAP, CATEGORIES } from "../../constants/categories.js";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function SmsImport() {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [category, setCategory] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleParse() {
    setSaved(false);
    setError("");
    setParsed(null);

    const result = parseSMS(text.trim());
    if (!result) {
      setError("This doesn't look like a payment SMS. Try a bank transaction message.");
      return;
    }

    const guessedCat = categorize(result.merchant, result.upiId, null);
    setCategory(guessedCat || "");
    setParsed(result);
  }

  async function handleSave() {
    if (!parsed) return;
    await db.transactions.add({
      amount: parsed.amount,
      merchant: parsed.merchant || "Unknown",
      category: category,
      source: parsed.upiId ? "UPI" : "Card",
      isDebit: parsed.isDebit,
      date: parsed.date ? new Date(parsed.date).getTime() : Date.now(),
      note: "Imported from SMS",
      createdAt: Date.now(),
    });

    if (parsed.merchant && category) {
      await db.merchantMap.put({ merchant: parsed.merchant, category });
    }

    setSaved(true);
    setText("");
    setParsed(null);
    setCategory("");
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">SMS Import</h2>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
        <h3 className="text-white font-semibold">Paste a bank SMS</h3>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your bank transaction SMS here..."
          rows={5}
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 outline-none focus:border-indigo-500 resize-none"
        />
        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium transition-colors"
        >
          Parse SMS
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-4">
          <XCircle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {parsed && !saved && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <AlertCircle size={18} className="text-yellow-400" />
            Review & Confirm
          </h3>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Amount</p>
              <p className="text-white font-semibold">₹{parsed.amount}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Type</p>
              <p className={`font-semibold ${parsed.isDebit ? "text-red-400" : "text-green-400"}`}>
                {parsed.isDebit ? "Expense" : "Income"}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Merchant</p>
              <p className="text-white">{parsed.merchant || "Unknown"}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Date</p>
              <p className="text-white">{parsed.date || "Today"}</p>
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-sm mb-2">Category</p>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 outline-none focus:border-indigo-500"
            >
              <option value="">Select Category</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Save Transaction
          </button>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl p-4">
          <CheckCircle size={18} />
          <p className="text-sm">Transaction saved successfully!</p>
        </div>
      )}
    </div>
  );
}