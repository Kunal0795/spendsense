import { LayoutDashboard, ArrowLeftRight, PieChart, Wallet, RefreshCcw, MessageSquare } from "lucide-react";
import { useApp } from "../../contexts/AppContext.jsx";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "analytics", label: "Analytics", icon: PieChart },
  { id: "budgets", label: "Budgets", icon: Wallet },
  { id: "subscriptions", label: "Subscriptions", icon: RefreshCcw },
  { id: "sms", label: "SMS Import", icon: MessageSquare },
];

export default function Sidebar() {
  const { page, setPage } = useApp();

  return (
    <aside className="w-64 h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">💸 SpendSense</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              page === id
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}