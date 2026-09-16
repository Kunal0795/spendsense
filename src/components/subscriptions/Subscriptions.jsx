import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/index.js";
import { useApp } from "../../contexts/AppContext.jsx";
import { Trash2, Lock } from "lucide-react";
import Skeleton from "../shared/Skeleton.jsx";
import Amount from "../shared/Amount.jsx";
import { usePrivateMode } from "../../hooks/usePrivateMode.js";

const CYCLES = ["Monthly", "Weekly", "Yearly"];

const defaultForm = { name: "", amount: "", cycle: "Monthly", nextDate: "" };

export default function Subscriptions() {
  const { currency } = useApp();
  const [form, setForm] = useState(defaultForm);
  const { isPrivate } = usePrivateMode();

  const fmt = (n) => `${currency === "INR" ? "₹" : "$"}${n.toLocaleString("en-IN")}`;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const subs = useLiveQuery(
    async () => {
      const all = await db.subscriptions.toArray();
      return all.sort((a, b) => a.nextDate - b.nextDate);
    }
  );

  async function handleAdd() {
    if (!form.name || !form.amount || !form.nextDate) return;
    await db.subscriptions.add({
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      cycle: form.cycle,
      nextDate: new Date(form.nextDate).getTime(),
      createdAt: Date.now(),
    });
    setForm(defaultForm);
  }

  async function handleDelete(id) {
    await db.subscriptions.delete(id);
  }

  const fmtDate = (ts) => new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });

  const daysUntil = (ts) => {
    const diff = ts - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (subs === undefined) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h2>
        <Skeleton variant="card" />
        <Skeleton variant="list-item" />
        <Skeleton variant="list-item" />
      </div>
    );
  }

  const totalMonthly = subs.reduce((s, sub) => {
    if (sub.cycle === "Monthly") return s + sub.amount;
    if (sub.cycle === "Yearly") return s + sub.amount / 12;
    if (sub.cycle === "Weekly") return s + sub.amount * 4;
    return s;
  }, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        Subscriptions
        {isPrivate && <Lock size={18} className="text-gray-400" />}
      </h2>

      {/* Add Subscription */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Add Subscription</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Name (e.g. Netflix)"
            value={form.name}
            onChange={e => set("name", e.target.value)}
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm border border-gray-300 dark:border-gray-700 outline-none focus:border-indigo-500 placeholder-gray-400 dark:placeholder-gray-600"
          />
          <input
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={e => set("amount", e.target.value)}
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm border border-gray-300 dark:border-gray-700 outline-none focus:border-indigo-500 placeholder-gray-400 dark:placeholder-gray-600"
          />
          <select
            value={form.cycle}
            onChange={e => set("cycle", e.target.value)}
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm border border-gray-300 dark:border-gray-700 outline-none focus:border-indigo-500"
          >
            {CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="date"
            value={form.nextDate}
            onChange={e => set("nextDate", e.target.value)}
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm border border-gray-300 dark:border-gray-700 outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={handleAdd}
          className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg text-sm font-medium transition-colors"
        >
          Add Subscription
        </button>
      </div>

      {/* Monthly total */}
      {subs.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex justify-between items-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Estimated Monthly Cost</p>
          <p className="text-gray-900 dark:text-white font-bold text-lg"><Amount value={fmt(Math.round(totalMonthly))} id="sub-monthly" /></p>
        </div>
      )}

      {/* Subscription List */}
      {subs.length === 0 ? (
        <p className="text-gray-500 text-sm">No subscriptions tracked yet.</p>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {subs.map(s => {
            const days = daysUntil(s.nextDate);
            return (
              <div key={s.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium text-sm">{s.name}</p>
                  <p className="text-gray-500 text-xs">
                    {s.cycle} · Next: {fmtDate(s.nextDate)}
                    <span className={`ml-2 ${days <= 3 ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
                      ({days <= 0 ? "Due!" : `${days}d away`})
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-900 dark:text-white font-semibold text-sm"><Amount value={fmt(s.amount)} id={`sub-${s.id}`} /></span>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}