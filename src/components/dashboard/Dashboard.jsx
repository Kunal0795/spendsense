import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/index.js";
import { useApp } from "../../contexts/AppContext.jsx";
import {
  TrendingDown, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight,
  MessageSquare, Lock
} from "lucide-react";
import Skeleton from "../shared/Skeleton.jsx";
import { merchantColor } from "../../utils/merchantColor.js";
import { motion } from "framer-motion";
import PageTransition from "../shared/PageTransition.jsx";
import { useHaptics } from "../../hooks/useHaptics.js";
import Amount from "../shared/Amount.jsx";
import { usePrivateMode } from "../../hooks/usePrivateMode.js";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, iconColor, gradient, trend, trendLabel }) {
  const isPositive = trend >= 0;

  return (
    <div className={`relative rounded-2xl p-5 border overflow-hidden
      bg-gradient-to-br ${gradient}
      border-gray-200 dark:border-gray-800
      bg-white dark:bg-gray-900`}
    >
      {/* Icon top-right */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium tracking-wide uppercase text-gray-500 dark:text-gray-400">
          {title}
        </p>
        <div className={`p-2 rounded-xl ${iconColor} bg-white/60 dark:bg-black/20`}>
          <Icon size={16} />
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none mb-2">
        <Amount value={value} id={`stat-${title}`} />
      </p>

      {/* Trend vs last month */}
      {trendLabel !== null && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
          }`}>
          {isPositive
            ? <ArrowUpRight size={13} />
            : <ArrowDownRight size={13} />
          }
          <span><Amount value={trendLabel} id={`stat-trend-${title}`} /></span>
          <span className="text-gray-400 dark:text-gray-500 font-normal">vs last month</span>
        </div>
      )}
    </div>
  );
}

// ─── Merchant Avatar ──────────────────────────────────────────────────────────

function MerchantAvatar({ name }) {
  const bg = merchantColor(name);
  const letter = (name || "?")[0].toUpperCase();
  return (
    <div className={`h-9 w-9 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-sm font-bold">{letter}</span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onImport }) {
  const { triggerLight } = useHaptics();
  
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
        <Wallet size={48} className="text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-base font-medium text-gray-700 dark:text-gray-300">
        No transactions yet
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
        Import your SMS messages to get started
      </p>
      <button
        onClick={() => {
          triggerLight();
          onImport();
        }}
        className="mt-2 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
      >
        <MessageSquare size={15} />
        Import SMS
      </button>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { currency, setPage } = useApp();
  const { triggerLight } = useHaptics();
  const { isPrivate } = usePrivateMode();

  const now = useMemo(() => new Date(), []);

  const startOfMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    [now]
  );

  const startOfLastMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
    [now]
  );

  // Current-month transactions
  const monthTxns = useLiveQuery(
    () => db.transactions.where("date").aboveOrEqual(startOfMonth).toArray(),
    [startOfMonth]
  );

  // Last-month transactions (for trend calculation)
  const lastMonthTxns = useLiveQuery(
    () =>
      db.transactions
        .where("date")
        .between(startOfLastMonth, startOfMonth, true, false)
        .toArray(),
    [startOfLastMonth, startOfMonth]
  );

  // 5 most recent transactions
  const recent = useLiveQuery(
    () => db.transactions.orderBy("date").reverse().limit(5).toArray()
  );

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!monthTxns) return null;
    const income = monthTxns.filter(t => !t.isDebit).reduce((s, t) => s + t.amount, 0);
    const expenses = monthTxns.filter(t => t.isDebit).reduce((s, t) => s + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [monthTxns]);

  const lastStats = useMemo(() => {
    if (!lastMonthTxns) return null;
    const income = lastMonthTxns.filter(t => !t.isDebit).reduce((s, t) => s + t.amount, 0);
    const expenses = lastMonthTxns.filter(t => t.isDebit).reduce((s, t) => s + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [lastMonthTxns]);

  const sym = currency === "INR" ? "₹" : "$";
  const fmt = (n) => `${sym}${Math.abs(n).toLocaleString("en-IN")}`;

  /** Returns e.g. "+₹1,200" or "-₹400" diff string, or null if no last-month data */
  function trendLabel(current, last) {
    if (last === null) return null;
    const diff = current - last;
    const sign = diff >= 0 ? "+" : "−";
    return `${sign}${fmt(diff)}`;
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (monthTxns === undefined || recent === undefined || lastMonthTxns === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton variant="stat" />
          <Skeleton variant="stat" />
          <Skeleton variant="stat" />
        </div>
        <Skeleton variant="card" />
      </div>
    );
  }

  const incomeTrend = trendLabel(stats.income, lastStats?.income ?? null);
  const expenseTrend = trendLabel(stats.expenses, lastStats?.expenses ?? null);
  const balanceTrend = trendLabel(stats.balance, lastStats?.balance ?? null);

  return (
    <PageTransition>
      <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Dashboard
          {isPrivate && <Lock size={18} className="text-gray-400" />}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {now.toLocaleString("en-IN", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.06 }
          }
        }}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } } }}>
          <StatCard
            title="Income"
            value={fmt(stats.income)}
            icon={TrendingUp}
            iconColor="text-emerald-600 dark:text-emerald-400"
            gradient="from-emerald-500/10 to-emerald-600/5"
            trend={stats.income - (lastStats?.income ?? 0)}
            trendLabel={incomeTrend}
          />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } } }}>
          <StatCard
            title="Expenses"
            value={fmt(stats.expenses)}
            icon={TrendingDown}
            iconColor="text-rose-600 dark:text-rose-400"
            gradient="from-rose-500/10 to-rose-600/5"
            trend={-(stats.expenses - (lastStats?.expenses ?? 0))}
            trendLabel={expenseTrend}
          />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } } }}>
          <StatCard
            title="Balance"
            value={`${stats.balance < 0 ? "−" : ""}${fmt(stats.balance)}`}
            icon={Wallet}
            iconColor="text-blue-600 dark:text-blue-400"
            gradient="from-blue-500/10 to-blue-600/5"
            trend={stats.balance - (lastStats?.balance ?? 0)}
            trendLabel={balanceTrend}
          />
        </motion.div>
      </motion.div>

      {/* ── Recent Transactions ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-gray-900 dark:text-white font-semibold text-sm">
            Recent Transactions
          </h3>
          {recent.length > 0 && (
            <button
              onClick={() => {
                triggerLight();
                setPage("transactions");
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              View all
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState onImport={() => setPage("sms")} />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recent.map(t => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                {/* Merchant avatar */}
                <MerchantAvatar name={t.merchant || "?"} />

                {/* Merchant + category */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {t.merchant || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {t.category || "Uncategorized"}
                  </p>
                </div>

                {/* Amount */}
                <span className={`text-sm font-semibold tabular-nums ${t.isDebit
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                  {t.isDebit ? "−" : "+"}<Amount value={fmt(t.amount)} id={`recent-${t.id}`} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </PageTransition>
  );
}