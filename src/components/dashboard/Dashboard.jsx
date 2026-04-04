import { useEffect, useState } from "react";
import { db } from "../../db/index.js";
import { useApp } from "../../contexts/AppContext.jsx";
import { TrendingDown, TrendingUp, Wallet, AlertCircle } from "lucide-react";

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-400 text-sm">{title}</p>
        <Icon size={18} className={color} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { currency } = useApp();
  const [stats, setStats] = useState({ income: 0, expenses: 0, balance: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const txns = await db.transactions
        .where("date")
        .aboveOrEqual(startOfMonth.getTime())
        .toArray();

      const income = txns.filter(t => !t.isDebit).reduce((s, t) => s + t.amount, 0);
      const expenses = txns.filter(t => t.isDebit).reduce((s, t) => s + t.amount, 0);
      setStats({ income, expenses, balance: income - expenses });

      const all = await db.transactions.orderBy("date").reverse().limit(5).toArray();
      setRecent(all);
    }
    load();
  }, []);

  const fmt = (n) => `${currency === "INR" ? "₹" : "$"}${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="This Month's Income" value={fmt(stats.income)} icon={TrendingUp} color="text-green-400" />
        <StatCard title="This Month's Expenses" value={fmt(stats.expenses)} icon={TrendingDown} color="text-red-400" />
        <StatCard title="Balance" value={fmt(stats.balance)} icon={Wallet} color="text-indigo-400" />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="text-white font-semibold mb-4">Recent Transactions</h3>
        {recent.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-500">
            <AlertCircle size={16} />
            <p className="text-sm">No transactions yet. Add one to get started.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {recent.map(t => (
              <li key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{t.merchant || "Unknown"}</p>
                  <p className="text-gray-500 text-xs">{t.category || "Uncategorized"}</p>
                </div>
                <span className={`text-sm font-semibold ${t.isDebit ? "text-red-400" : "text-green-400"}`}>
                  {t.isDebit ? "-" : "+"}{fmt(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}