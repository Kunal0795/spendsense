import { useState } from "react";
import { db } from "../../db/index.js";
import { CATEGORIES, SOURCES } from "../../constants/categories.js";
import { X } from "lucide-react";

const defaultForm = {
  amount: "",
  merchant: "",
  category: "",
  source: "UPI",
  isDebit: true,
  date: new Date().toISOString().split("T")[0],
  note: "",
};

export default function AddTransaction({ onClose, onAdded }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.amount || !form.merchant) return;
    setSaving(true);
    await db.transactions.add({
      amount: parseFloat(form.amount),
      merchant: form.merchant.trim(),
      category: form.category,
      source: form.source,
      isDebit: form.isDebit,
      date: new Date(form.date).getTime(),
      note: form.note.trim(),
      createdAt: Date.now(),
    });
    setSaving(false);
    onAdded?.();
    onClose?.();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-lg">Add Transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => set("isDebit", true)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${form.isDebit ? "bg-red-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}
            >
              Expense
            </button>
            <button
              onClick={() => set("isDebit", false)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${!form.isDebit ? "bg-green-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <input
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={e => set("amount", e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-gray-700 focus:border-indigo-500"
          />

          {/* Merchant */}
          <input
            type="text"
            placeholder="Merchant / Person"
            value={form.merchant}
            onChange={e => set("merchant", e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-gray-700 focus:border-indigo-500"
          />

          {/* Category */}
          <select
            value={form.category}
            onChange={e => set("category", e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-gray-700 focus:border-indigo-500"
          >
            <option value="">Select Category</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>

          {/* Source */}
          <select
            value={form.source}
            onChange={e => set("source", e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-gray-700 focus:border-indigo-500"
          >
            {SOURCES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Date */}
          <input
            type="date"
            value={form.date}
            onChange={e => set("date", e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-gray-700 focus:border-indigo-500"
          />

          {/* Note */}
          <input
            type="text"
            placeholder="Note (optional)"
            value={form.note}
            onChange={e => set("note", e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-gray-700 focus:border-indigo-500"
          />

          <button
            onClick={handleSave}
            disabled={saving || !form.amount || !form.merchant}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}