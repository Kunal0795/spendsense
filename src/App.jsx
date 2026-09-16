import { useState, lazy, Suspense, useEffect, useRef } from "react";
import { useApp } from "./contexts/AppContext.jsx";
import Layout from "./components/layout/Layout.jsx";
import Skeleton from "./components/shared/Skeleton.jsx";
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

// ── Eager imports (most visited pages — no lazy loading) ─────────────────────
import Dashboard from "./components/dashboard/Dashboard.jsx";
import Transactions from "./components/transactions/Transactions.jsx";
import AddTransaction from "./components/transactions/AddTransaction.jsx";
import Budgets from "./components/budgets/Budgets.jsx";
import SmsImport from "./components/sms/SmsImport.jsx";

// ── Lazy imports (code-split into separate chunks) ───────────────────────────
const Analytics = lazy(() => import("./components/analytics/Analytics.jsx"));
const Subscriptions = lazy(() => import("./components/subscriptions/Subscriptions.jsx"));
const Settings = lazy(() => import("./components/settings/Settings.jsx"));

// ── Per-page Suspense fallbacks ──────────────────────────────────────────────
function AnalyticsFallback() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      <Skeleton variant="chart" />
      <Skeleton variant="chart" />
    </div>
  );
}

function SubscriptionsFallback() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      <Skeleton variant="list-item" />
      <Skeleton variant="list-item" />
      <Skeleton variant="list-item" />
    </div>
  );
}

function SettingsFallback() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  );
}

export default function App() {
  const { page, setPage, theme } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPress = useRef(0);

  // Status Bar Theme
  useEffect(() => {
    if (typeof window === "undefined" || !window.Capacitor?.isNativePlatform()) return;
    const updateStatusBar = async () => {
      try {
        if (theme === "dark") {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#030712' });
        } else {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#f9fafb' });
        }
      } catch (e) {
        // ignore
      }
    };
    updateStatusBar();
  }, [theme]);

  // Android Back Button
  useEffect(() => {
    if (typeof window === "undefined" || !window.Capacitor?.isNativePlatform()) return;

    const backListener = CapacitorApp.addListener('backButton', () => {
      if (showAdd) {
        setShowAdd(false);
        return;
      }
      if (page !== "dashboard") {
        setPage("dashboard");
        return;
      }
      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        CapacitorApp.exitApp();
      } else {
        lastBackPress.current = now;
        setShowExitToast(true);
        setTimeout(() => setShowExitToast(false), 2000);
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [page, showAdd, setPage]);

  return (
    <Layout onAdd={() => setShowAdd(true)}>
      {/* Toast */}
      {showExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 px-5 py-2.5 rounded-full text-sm font-medium z-50 shadow-lg animate-in fade-in slide-in-from-bottom-4">
          Press back again to exit
        </div>
      )}

      {/* Eager pages */}
      {page === "dashboard"    && <Dashboard key={showAdd} />}
      {page === "transactions" && <Transactions key={showAdd} />}
      {page === "budgets"      && <Budgets />}
      {page === "sms"          && <SmsImport />}

      {/* Lazy pages — each wrapped in its own Suspense with a tailored fallback */}
      {page === "analytics" && (
        <Suspense fallback={<AnalyticsFallback />}>
          <Analytics />
        </Suspense>
      )}
      {page === "subscriptions" && (
        <Suspense fallback={<SubscriptionsFallback />}>
          <Subscriptions />
        </Suspense>
      )}
      {page === "settings" && (
        <Suspense fallback={<SettingsFallback />}>
          <Settings />
        </Suspense>
      )}

      {/* Add transaction modal — always eager, must be instant */}
      {showAdd && (
        <AddTransaction
          onClose={() => setShowAdd(false)}
          onAdded={() => setShowAdd(false)}
        />
      )}
    </Layout>
  );
}