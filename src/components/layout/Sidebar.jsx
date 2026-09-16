import {
  LayoutDashboard, ArrowLeftRight, PieChart,
  Wallet, RefreshCcw, MessageSquare, Settings,
} from "lucide-react";
import { useApp } from "../../contexts/AppContext.jsx";

const navItems = [
  { id: "dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { id: "transactions",  label: "Transactions",  icon: ArrowLeftRight },
  { id: "analytics",     label: "Analytics",     icon: PieChart },
  { id: "budgets",       label: "Budgets",        icon: Wallet },
  { id: "subscriptions", label: "Subscriptions", icon: RefreshCcw },
  { id: "sms",           label: "SMS Import",    icon: MessageSquare },
  { id: "settings",      label: "Settings",      icon: Settings },
];

// On mobile we only show 5 items in the bottom bar to avoid overflow
const mobileItems = [
  { id: "dashboard",    label: "Home",      icon: LayoutDashboard },
  { id: "transactions", label: "Txns",      icon: ArrowLeftRight },
  { id: "analytics",    label: "Analytics", icon: PieChart },
  { id: "sms",      label: "SMS",   icon: MessageSquare },
  { id: "settings",     label: "Settings",  icon: Settings },
];

export default function Sidebar({ mobile = false }) {
  const { page, setPage } = useApp();

  // ── Mobile bottom tab bar ────────────────────────────────────────────────
  if (mobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex pb-[env(safe-area-inset-bottom)]">
        {mobileItems.map(({ id, label, icon }) => {
          const Icon = icon;
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  // ── Desktop sidebar ──────────────────────────────────────────────────────
  return (
    <aside className="w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">💸 SpendSense</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ id, label, icon }) => {
          const Icon = icon;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                page === id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
