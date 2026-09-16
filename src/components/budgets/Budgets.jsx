import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/index.js";
import { CATEGORIES, CAT_MAP } from "../../constants/categories.js";
import { useApp } from "../../contexts/AppContext.jsx";
import { Trash2, Lock } from "lucide-react";
import Skeleton from "../shared/Skeleton.jsx";
import PageTransition from "../shared/PageTransition.jsx";
import { useHaptics } from "../../hooks/useHaptics.js";
import Amount from "../shared/Amount.jsx";
import { usePrivateMode } from "../../hooks/usePrivateMode.js";

export default function Budgets() {
  const { currency } = useApp();
  const [form, setForm] = useState({ category: "", limit: "", rollover: false });
  const { triggerLight } = useHaptics();
  const { isPrivate } = usePrivateMode();

  const fmt = (n) => `${currency === "INR" ? "₹" : "$"}${n.toLocaleString("en-IN")}`;

  const startOfMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }, []);

  const budgets = useLiveQuery(() => db.budgets.toArray());

  const monthTxns = useLiveQuery(
    () => db.transactions.where("date").aboveOrEqual(startOfMonth).toArray(),
    [startOfMonth]
  );

  const spending = useMemo(() => {
    if (!monthTxns) return {};
    const spent = {};
    monthTxns.filter(t => t.isDebit).forEach(t => {
      spent[t.category] = (spent[t.category] || 0) + t.amount;
    });
    return spent;
  }, [monthTxns]);

  async function handleAdd() {
    triggerLight();
    if (!form.category || !form.limit) return;
    const existing = await db.budgets.where("category").equals(form.category).first();
    if (existing) {
      await db.budgets.update(existing.id, { limit: parseFloat(form.limit), rollover: form.rollover });
    } else {
      await db.budgets.add({ category: form.category, limit: parseFloat(form.limit), rollover: form.rollover, carriedAmount: 0 });
    }
    setForm({ category: "", limit: "", rollover: false });
  }

  async function handleDelete(id) {
    await db.budgets.delete(id);
  }

  if (budgets === undefined || monthTxns === undefined) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h2>
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        Budgets
        {isPrivate && <Lock size={18} className="text-gray-400" />}
      </h2>

      {/* Add Budget */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Set Monthly Budget</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm border border-gray-300 dark:border-gray-700 outline-none focus:border-indigo-500"
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
            className="w-full sm:w-36 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm border border-gray-300 dark:border-gray-700 outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAdd}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
        <label className="flex items-center gap-2 mt-4 cursor-pointer w-max">
          <input 
            type="checkbox" 
            checked={form.rollover} 
            onChange={e => setForm(f => ({ ...f, rollover: e.target.checked }))}
            className="rounded text-indigo-600 focus:ring-indigo-500 bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-700 h-4 w-4 cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Rollover</span>
        </label>
      </div>

      {/* Budget List */}
      {budgets.length === 0 ? (
        <p className="text-gray-500 text-sm">No budgets set yet.</p>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => {
            const cat = CAT_MAP[b.category];
            const spent = spending[b.category] || 0;
            const effectiveLimit = b.limit + (b.carriedAmount || 0);
            const pct = Math.min((spent / effectiveLimit) * 100, 100);
            const over = spent > effectiveLimit;
            return (
              <div key={b.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat?.emoji}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{cat?.label}</span>
                    </div>
                    {b.rollover && b.carriedAmount > 0 && (
                      <span className="text-[10px] font-bold tracking-wide uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded ml-0 sm:ml-2 w-max">
                        +<Amount value={fmt(b.carriedAmount)} id={`budget-carried-${b.id}`} /> rolled over
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-semibold ${over ? "text-red-500 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                      <Amount value={fmt(spent)} id={`budget-spent-${b.id}`} /> / <Amount value={fmt(effectiveLimit)} id={`budget-limit-${b.id}`} />
                    </span>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${over ? "bg-red-500" : "bg-indigo-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {over && <p className="text-red-500 dark:text-red-400 text-xs mt-1">Over budget by <Amount value={fmt(spent - effectiveLimit)} id={`budget-over-${b.id}`} /></p>}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </PageTransition>
  );
}