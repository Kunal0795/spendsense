import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/index.js";
import { CAT_MAP } from "../../constants/categories.js";
import { useApp } from "../../contexts/AppContext.jsx";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import Skeleton from "../shared/Skeleton.jsx";
import PageTransition from "../shared/PageTransition.jsx";
import Insights from "./Insights.jsx";
import Amount from "../shared/Amount.jsx";
import { usePrivateMode } from "../../hooks/usePrivateMode.js";
import { Lock } from "lucide-react";

export default function Analytics() {
  const { currency } = useApp();
  const { isPrivate } = usePrivateMode();

  const fmt = (n) => `${currency === "INR" ? "₹" : "$"}${n.toLocaleString("en-IN")}`;

  const txns = useLiveQuery(() => db.transactions.toArray());

  const categoryData = useMemo(() => {
    if (!txns) return [];
    const expenses = txns.filter(t => t.isDebit);
    const catTotals = {};
    expenses.forEach(t => {
      const key = t.category || "other";
      catTotals[key] = (catTotals[key] || 0) + t.amount;
    });
    return Object.entries(catTotals).map(([id, total]) => ({
      name: CAT_MAP[id]?.label || "Other",
      value: total,
      color: CAT_MAP[id]?.color || "#6366f1",
      emoji: CAT_MAP[id]?.emoji || "💸",
    })).sort((a, b) => b.value - a.value);
  }, [txns]);

  const monthlyData = useMemo(() => {
    if (!txns) return [];
    const monthly = {};
    txns.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) monthly[key] = { month: key, income: 0, expenses: 0 };
      if (t.isDebit) monthly[key].expenses += t.amount;
      else monthly[key].income += t.amount;
    });
    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [txns]);

  if (txns === undefined) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
        <Skeleton variant="chart" />
        <Skeleton variant="chart" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        Analytics
        {isPrivate && <Lock size={18} className="text-gray-400" />}
      </h2>

      <Insights />

      {/* Category Pie Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Spending by Category</h3>
        {categoryData.length === 0 ? (
          <p className="text-gray-500 text-sm">No expense data yet.</p>
        ) : (
          <div className="flex gap-6 items-center">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={80}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [<Amount value={fmt(v)} id={`pie-${v}`} />, "Total"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {categoryData.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-gray-600 dark:text-gray-300">{c.emoji} {c.name}</span>
                  <span className="text-gray-900 dark:text-white font-medium ml-auto pl-4"><Amount value={fmt(c.value)} id={`cat-list-${c.name}`} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Monthly Overview</h3>
        {monthlyData.length === 0 ? (
          <p className="text-gray-500 text-sm">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" stroke="#9ca3af" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <Tooltip
                formatter={(v, name) => [<Amount value={fmt(v)} id={`bar-${v}`} />, name]}
                contentStyle={{
                  backgroundColor: "var(--tooltip-bg, #1f2937)",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
              />
              <Bar dataKey="income"   fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      </div>
    </PageTransition>
  );
}