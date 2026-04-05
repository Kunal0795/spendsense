import { useEffect, useState } from "react";
import { db } from "../../db/index.js";
import { CATEGORIES, CAT_MAP } from "../../constants/categories.js";
import { useApp } from "../../contexts/AppContext.jsx";
import { Trash2 } from "lucide-react";

export default function Budgets() {
  const { currency } = useApp();
  const [budgets, setBudgets] = useState([]);
  const [spending, setSpending] = useState({});
  const [form, setForm] = useState({ category: "", limit: "" });

  const fmt = (n) => `${currency === "INR" ? "₹" : "$"}${n.toLocaleString("en-IN")}`;

  async function load() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const allBudgets = await db.budgets.toArray();
    setBudgets(allBudgets);

    const txns = await db.transactions
      .where("date").aboveOrEqual(startOfMonth).toArray();

    const spent = {};
    txns.filter(t => t.isDebit).forEach(t => {
      spent[t.category] = (spent[t.category] || 0) + t.amount;
    });
    setSpending(spent);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!form.category || !form.limit) return;
    const existing = await db.budgets.where("category").equals(form.category).first();
    if (existing) {
      await db.budgets.update(existing.id, { limit: parseFloat(form.limit) });
    } else {
      await db.budgets.add({ category: form.category, limit: parseFloat(form.limit) });
    }
    setForm({ category: "", limit: "" });
    load();
  }

  async function handleDelete(id) {
    await db.budgets.delete(id);
    load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Budgets</h2>

      {/* Add Budget */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="text-white font-semibold mb-4">Set Monthly Budget</h3>
        <div className="flex gap-3">
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 outline-none focus:border-indigo-500"
          >
            <option value="">Select Category</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Limit"
            value={form.limit}
            onChange={e => setForm(f => ({ ...f, limit: e.target.value }))}
            className="w-36 bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAdd}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Budget List */}
      {budgets.length === 0 ? (
        <p className="text-gray-500 text-sm">No budgets set yet.</p>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => {
            const cat = CAT_MAP[b.category];
            const spent = spending[b.category] || 0;
            const pct = Math.min((spent / b.limit) * 100, 100);
            const over = spent > b.limit;
            return (
              <div key={b.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat?.emoji}</span>
                    <span className="text-white font-medium">{cat?.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-semibold ${over ? "text-red-400" : "text-gray-300"}`}>
                      {fmt(spent)} / {fmt(b.limit)}
                    </span>
                    <button onClick={() => handleDelete(b.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${over ? "bg-red-500" : "bg-indigo-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {over && <p className="text-red-400 text-xs mt-1">Over budget by {fmt(spent - b.limit)}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}