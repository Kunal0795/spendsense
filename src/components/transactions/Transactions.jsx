import { useState, useMemo, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/index.js";
import { CAT_MAP } from "../../constants/categories.js";
import { Trash2, Filter, X, Search, Lock } from "lucide-react";
import { useApp } from "../../contexts/AppContext.jsx";
import ExportCSVButton from "./ExportCSV.jsx";
import Skeleton from "../shared/Skeleton.jsx";
import PageTransition from "../shared/PageTransition.jsx";
import { useHaptics } from "../../hooks/useHaptics.js";
import Amount from "../shared/Amount.jsx";
import { usePrivateMode } from "../../hooks/usePrivateMode.js";

function TransactionItem({ t, cat, fmt, fmtDate, onDelete }) {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(null);
  const currentX = useRef(null);
  const { triggerMedium } = useHaptics();

  const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;

  const handleTouchStart = (e) => {
    if (!isTouch) return;
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isTouch || startX.current === null) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Only allow swiping left
    if (diff < 0) {
      setOffset(Math.max(diff, -160));
    } else {
      setOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isTouch || startX.current === null) return;
    setIsSwiping(false);
    
    if (offset < -150) {
      setOffset(0);
      if (window.confirm("Delete this transaction?")) {
        triggerMedium();
        onDelete(t.id);
      }
    } else if (offset < -80) {
      setOffset(-80);
    } else {
      setOffset(0);
    }
    startX.current = null;
  };

  const manualDelete = () => {
    triggerMedium();
    onDelete(t.id);
  };

  return (
    <div className="relative overflow-hidden group">
      {/* Background Delete Button */}
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center">
        <button onClick={manualDelete} className="text-white p-4 h-full w-full flex items-center justify-center">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Foreground Item */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative bg-white dark:bg-gray-900 px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 ${
          !isSwiping ? "transition-transform duration-200 ease-out" : ""
        }`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        <div className="flex items-center gap-4">
          <div className="text-2xl">{cat?.emoji || "💸"}</div>
          <div>
            <p className="text-gray-900 dark:text-white text-sm font-medium">{t.merchant}</p>
            <p className="text-gray-500 text-xs">
              {cat?.label || "Uncategorized"} · {t.source} · {fmtDate(t.date)}
            </p>
            {t.note && <p className="text-gray-400 dark:text-gray-600 text-xs italic">{t.note}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-semibold ${t.isDebit ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
            {t.isDebit ? "-" : "+"}<Amount value={fmt(t.amount)} id={`txn-${t.id}`} />
          </span>
          {!isTouch && (
            <button
              onClick={manualDelete}
              className="text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const { currency } = useApp();
  const { triggerLight } = useHaptics();
  const { isPrivate } = usePrivateMode();

  // URL Persistence
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      search: params.get("search") || "",
      dateFrom: params.get("dateFrom") || "",
      dateTo: params.get("dateTo") || "",
      type: params.get("type") || "All",
      category: params.get("category") || "all",
      minAmount: params.get("minAmount") || "",
      maxAmount: params.get("maxAmount") || "",
    };
  });

  const [searchInput, setSearchInput] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.type !== "All") params.set("type", filters.type);
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.minAmount) params.set("minAmount", filters.minAmount);
    if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);

    const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, "", newUrl);
  }, [filters]);

  const txns = useLiveQuery(
    () => db.transactions.orderBy("date").reverse().toArray()
  );

  const dbCategories = useLiveQuery(
    () => db.transactions.orderBy("category").uniqueKeys()
  );

  const filteredTxns = useMemo(() => {
    if (!txns) return [];
    return txns.filter(t => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const m = t.merchant?.toLowerCase() || "";
        const n = t.note?.toLowerCase() || "";
        if (!m.includes(q) && !n.includes(q)) return false;
      }
      if (filters.dateFrom) {
        if (new Date(t.date) < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo) {
        const endDay = new Date(filters.dateTo);
        endDay.setHours(23, 59, 59, 999);
        if (new Date(t.date) > endDay) return false;
      }
      if (filters.type === "Debit" && !t.isDebit) return false;
      if (filters.type === "Credit" && t.isDebit) return false;
      if (filters.type === "Refund" && (t.isDebit || !/(refund|reversal)/i.test(t.note || t.type || ""))) return false;
      
      if (filters.category !== "all" && t.category !== filters.category) return false;
      
      if (filters.minAmount && t.amount < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && t.amount > parseFloat(filters.maxAmount)) return false;
      
      return true;
    });
  }, [txns, filters]);

  const activeFilterCount = Object.keys(filters).reduce((acc, key) => {
    if (key === "search") return acc;
    if (key === "type" && filters[key] === "All") return acc;
    if (key === "category" && filters[key] === "all") return acc;
    if (filters[key]) return acc + 1;
    return acc;
  }, (filters.search ? 1 : 0));

  function clearAll() {
    setSearchInput("");
    setFilters({
      search: "",
      dateFrom: "",
      dateTo: "",
      type: "All",
      category: "all",
      minAmount: "",
      maxAmount: "",
    });
  }

  async function handleDelete(id) {
    await db.transactions.delete(id);
  }

  const fmt = (n) => `${currency === "INR" ? "₹" : "$"}${n.toLocaleString("en-IN")}`;
  const fmtDate = (ts) => new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });

  if (txns === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h2>
        </div>
        <div className="space-y-2">
          <Skeleton variant="list-item" />
          <Skeleton variant="list-item" />
          <Skeleton variant="list-item" />
          <Skeleton variant="list-item" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Transactions
            {isPrivate && <Lock size={18} className="text-gray-400" />}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerLight();
                setShowFilters(!showFilters);
              }}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFilters || activeFilterCount > 0
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <Filter size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div onClick={triggerLight}>
              <ExportCSVButton />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filter Transactions</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 flex items-center gap-1 font-medium"
                >
                  <X size={14} /> Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Merchant or description"
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Type */}
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</label>
                <div className="flex bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                  {["All", "Debit", "Credit", "Refund"].map(t => (
                    <button
                      key={t}
                      onClick={() => setFilters(f => ({ ...f, type: t }))}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        filters.type === t
                          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date From */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Date To */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="all">All Categories</option>
                  {(dbCategories || []).filter(Boolean).map(catId => {
                    const c = CAT_MAP[catId];
                    return (
                      <option key={catId} value={catId}>
                        {c?.emoji} {c?.label || catId}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Amount Range */}
              <div className="space-y-1.5 flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Min {currency === "INR" ? "₹" : "$"}</label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => setFilters(f => ({ ...f, minAmount: e.target.value }))}
                    placeholder="Min"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Max {currency === "INR" ? "₹" : "$"}</label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters(f => ({ ...f, maxAmount: e.target.value }))}
                    placeholder="Max"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions List */}
        {filteredTxns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No transactions found matching your filters.</p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="mt-2 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {filteredTxns.map(t => {
              const cat = CAT_MAP[t.category];
              return (
                <TransactionItem 
                  key={t.id} 
                  t={t} 
                  cat={cat} 
                  fmt={fmt} 
                  fmtDate={fmtDate} 
                  onDelete={handleDelete} 
                />
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}