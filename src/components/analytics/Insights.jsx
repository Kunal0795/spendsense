import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/index.js";
import { useApp } from "../../contexts/AppContext.jsx";
import { CAT_MAP } from "../../constants/categories.js";
import { detectRecurring } from "../../utils/recurringDetector.js";
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, Calendar, ArrowRight } from "lucide-react";
import { useHaptics } from "../../hooks/useHaptics.js";
import Amount from "../shared/Amount.jsx";

function InsightCard({ icon: Icon, colorClass, borderClass, title, subtitle, actionLabel, onAction }) {
  const { triggerLight } = useHaptics();

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border-l-4 ${borderClass} border-y border-r border-y-gray-200 border-r-gray-200 dark:border-y-gray-800 dark:border-r-gray-800 p-4 flex gap-4 items-start shadow-sm`}>
      <div className={`p-2 rounded-full bg-gray-50 dark:bg-gray-800 mt-1 flex-shrink-0 ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <p className="text-gray-900 dark:text-white font-medium text-sm leading-snug">{title}</p>
        {subtitle && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{subtitle}</p>}
        {actionLabel && onAction && (
          <button
            onClick={() => {
              triggerLight();
              onAction();
            }}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {actionLabel} <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Insights() {
  const { currency, setPage } = useApp();
  const fmt = (n) => `${currency === "INR" ? "₹" : "$"}${Math.abs(n).toLocaleString("en-IN")}`;

  const now = useMemo(() => new Date(), []);
  const startOfMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1).getTime(), [now]);
  const startOfLastMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), [now]);

  const txns = useLiveQuery(() => db.transactions.toArray());
  const monthTxns = useLiveQuery(() => db.transactions.where("date").aboveOrEqual(startOfMonth).toArray(), [startOfMonth]);
  const lastMonthTxns = useLiveQuery(() => db.transactions.where("date").between(startOfLastMonth, startOfMonth, true, false).toArray(), [startOfMonth, startOfLastMonth]);
  const budgets = useLiveQuery(() => db.budgets.toArray());

  const insights = useMemo(() => {
    if (!txns || !monthTxns || !lastMonthTxns || !budgets) return [];
    const list = [];

    const monthDebits = monthTxns.filter(t => t.isDebit);

    // 1. Top Category this month
    const catTotals = {};
    monthDebits.forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    const topCatId = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0];
    
    if (topCatId && catTotals[topCatId] > 0) {
      const lastMonthCatTotal = lastMonthTxns.filter(t => t.isDebit && t.category === topCatId).reduce((s, t) => s + t.amount, 0);
      const current = catTotals[topCatId];
      const catName = CAT_MAP[topCatId]?.label || "Other";
      
      let subtitle = "";
      if (lastMonthCatTotal > 0) {
        const pct = Math.round(((current - lastMonthCatTotal) / lastMonthCatTotal) * 100);
        if (pct > 0) {
          subtitle = <span className="text-red-500 font-medium">↑ {pct}% vs last month</span>;
        } else {
          subtitle = <span className="text-green-500 font-medium">↓ {Math.abs(pct)}% vs last month</span>;
        }
      } else {
        subtitle = "No spending in this category last month.";
      }

      list.push({
        id: "top-cat",
        icon: current >= lastMonthCatTotal ? TrendingUp : TrendingDown,
        colorClass: current >= lastMonthCatTotal ? "text-red-500" : "text-emerald-500",
        borderClass: current >= lastMonthCatTotal ? "border-l-red-500" : "border-l-emerald-500",
        title: <>You spent <strong><Amount value={fmt(current)} id="insight-topcat" /></strong> on {catName} this month</>,
        subtitle,
      });
    }

    // 2. Biggest single expense
    if (monthDebits.length > 0) {
      const biggest = [...monthDebits].sort((a, b) => b.amount - a.amount)[0];
      if (biggest && biggest.amount > 0) {
        list.push({
          id: "biggest-exp",
          icon: AlertCircle,
          colorClass: "text-amber-500",
          borderClass: "border-l-amber-500",
          title: <>Your biggest single expense was <strong>{biggest.merchant}</strong> at <strong><Amount value={fmt(biggest.amount)} id="insight-big" /></strong></>,
          subtitle: new Date(biggest.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }),
        });
      }
    }

    // 3. Recurring detection
    const recurring = detectRecurring(txns);
    if (recurring.length > 0) {
      const topRecurring = recurring[0];
      list.push({
        id: "recurring",
        icon: RefreshCw,
        colorClass: "text-indigo-500",
        borderClass: "border-l-indigo-500",
        title: <><strong>{topRecurring.merchant}</strong> appears every month</>,
        subtitle: <>Average of <Amount value={fmt(topRecurring.avgAmount)} id="insight-rec" /> per month</>,
        actionLabel: "Add to Subscriptions",
        onAction: async () => {
          await db.subscriptions.add({
            name: topRecurring.merchant,
            amount: topRecurring.avgAmount,
            cycle: "Monthly",
            nextDate: new Date().getTime(),
            createdAt: Date.now()
          });
          setPage("subscriptions");
        }
      });
    }

    // 4. Budgets
    if (budgets.length > 0) {
      // Find budget with highest pct
      let highestPct = -1;
      let worstBudget = null;
      let worstSpent = 0;

      for (const b of budgets) {
        const spent = monthDebits.filter(t => t.category === b.category).reduce((s, t) => s + t.amount, 0);
        const pct = spent / b.limit;
        if (pct > highestPct) {
          highestPct = pct;
          worstBudget = b;
          worstSpent = spent;
        }
      }

      if (worstBudget) {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysLeft = daysInMonth - now.getDate();
        const remaining = worstBudget.limit - worstSpent;
        const catName = CAT_MAP[worstBudget.category]?.label || "Category";

        list.push({
          id: "budget",
          icon: Calendar,
          colorClass: "text-blue-500",
          borderClass: "border-l-blue-500",
          title: <><strong>{daysLeft} days left</strong> this month</>,
          subtitle: remaining < 0 
            ? <>Over budget by <Amount value={fmt(Math.abs(remaining))} id="insight-rem" /> in {catName}</>
            : <><Amount value={fmt(remaining)} id="insight-rem" /> remaining in {catName}</>,
        });
      }
    }

    return list;
  }, [txns, monthTxns, lastMonthTxns, budgets, fmt, now, setPage]);

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {insights.map(i => (
        <InsightCard key={i.id} {...i} />
      ))}
    </div>
  );
}
