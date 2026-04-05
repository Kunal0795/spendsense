import { useEffect, useState } from "react";
import { db } from "../../db/index.js";
import { CATEGORIES, CAT_MAP } from "../../constants/categories.js";
import { useApp } from "../../contexts/AppContext.jsx";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

export default function Analytics() {
  const { currency } = useApp();
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  const fmt = (n) => `${currency === "INR" ? "₹" : "$"}${n.toLocaleString("en-IN")}`;

  useEffect(() => {
    async function load() {
      const txns = await db.transactions.toArray();
      const expenses = txns.filter(t => t.isDebit);

      // Category breakdown
      const catTotals = {};
      expenses.forEach(t => {
        const key = t.category || "other";
        catTotals[key] = (catTotals[key] || 0) + t.amount;
      });
      const catData = Object.entries(catTotals).map(([id, total]) => ({
        name: CAT_MAP[id]?.label || "Other",
        value: total,
        color: CAT_MAP[id]?.color || "#6366f1",
        emoji: CAT_MAP[id]?.emoji || "💸",
      })).sort((a, b) => b.value - a.value);
      setCategoryData(catData);

      // Monthly breakdown (last 6 months)
      const monthly = {};
      txns.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthly[key]) monthly[key] = { month: key, income: 0, expenses: 0 };
        if (t.isDebit) monthly[key].expenses += t.amount;
        else monthly[key].income += t.amount;
      });
      const sorted = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
      setMonthlyData(sorted);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Analytics</h2>

      {/* Category Pie Chart */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="text-white font-semibold mb-4">Spending by Category</h3>
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
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {categoryData.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-gray-300">{c.emoji} {c.name}</span>
                  <span className="text-white font-medium ml-auto pl-4">{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="text-white font-semibold mb-4">Monthly Overview</h3>
        {monthlyData.length === 0 ? (
          <p className="text-gray-500 text-sm">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}