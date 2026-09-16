/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../db/index.js";

const AppContext = createContext(null);

async function loadSetting(key, fallback) {
  try {
    const row = await db.settings.get(key);
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

async function saveSetting(key, value) {
  try {
    await db.settings.put({ key, value });
  } catch {
    // ignore
  }
}

export function AppProvider({ children }) {
  const [page, setPage]         = useState("dashboard");
  const [currency, setCurrency] = useState("INR");
  const [theme, setTheme]       = useState("dark");

  // Load saved settings and execute boot logic
  useEffect(() => {
    loadSetting("theme",    "dark").then(setTheme);
    loadSetting("currency", "INR").then(setCurrency);

    // Boot Logic: Budget Rollover
    (async () => {
      try {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
        const lastOpenedRow = await db.settings.get('lastOpenedMonth');
        const lastOpenedMonth = lastOpenedRow?.value;

        if (lastOpenedMonth && lastOpenedMonth !== currentMonth) {
          // It's a new month since last open! Run rollover calculation for the immediate prior month.
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

          const lastMonthTxns = await db.transactions
            .where('date')
            .between(lastMonthStart, lastMonthEnd, true, false)
            .toArray();

          const budgets = await db.budgets.toArray();

          for (const b of budgets) {
            if (b.rollover) {
              const spent = lastMonthTxns
                .filter(t => t.category === b.category && t.isDebit)
                .reduce((s, t) => s + t.amount, 0);
              
              const effectiveLimit = b.limit + (b.carriedAmount || 0);
              const unused = effectiveLimit - spent;
              
              b.carriedAmount = unused > 0 ? unused : 0;
              await db.budgets.put(b);
            }
          }
        }
        
        if (lastOpenedMonth !== currentMonth) {
          await db.settings.put({ key: 'lastOpenedMonth', value: currentMonth });
        }
      } catch (e) {
        console.error("Failed to run budget rollover:", e);
      }
    })();
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function handleSetTheme(val) {
    setTheme(val);
    saveSetting("theme", val);
  }

  function handleSetCurrency(val) {
    setCurrency(val);
    saveSetting("currency", val);
  }

  return (
    <AppContext.Provider
      value={{
        page, setPage,
        currency, setCurrency: handleSetCurrency,
        theme,    setTheme:    handleSetTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
