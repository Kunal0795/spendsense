/* eslint-disable react-refresh/only-export-components */
import { db } from "../../db/index.js";
import { CAT_MAP } from "../../constants/categories.js";
import { Download } from "lucide-react";
import { useState } from "react";

function toCSVRow(values) {
  return values
    .map((v) => {
      const str = v == null ? "" : String(v);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    })
    .join(",");
}

export async function exportTransactionsCSV() {
  const txns = await db.transactions.orderBy("date").reverse().toArray();
  if (txns.length === 0) return { success: false };

  const headers = ["Date", "Merchant", "Category", "Type", "Amount", "Source", "Note"];

  const rows = txns.map((t) => {
    const cat = CAT_MAP[t.category];
    const date = t.date
      ? new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "";
    return toCSVRow([
      date,
      t.merchant || "",
      cat?.label || t.category || "Uncategorized",
      t.isDebit ? "Expense" : "Income",
      t.amount?.toFixed(2) ?? "0.00",
      t.source || "",
      t.note || "",
    ]);
  });

  const csv = [toCSVRow(headers), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `spendsense-${new Date().toISOString().split("T")[0]}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { success: true, count: txns.length };
}

export default function ExportCSVButton() {
  const [state, setState] = useState("idle");

  async function handleExport() {
    setState("loading");
    const result = await exportTransactionsCSV();
    setState(result.success ? "success" : "empty");
    setTimeout(() => setState("idle"), 3000);
  }

  const labels = {
    idle:    "Export CSV",
    loading: "Exporting…",
    success: "Downloaded!",
    empty:   "No data yet",
  };

  const colours = {
    idle:    "bg-indigo-600 hover:bg-indigo-500 text-white",
    loading: "bg-indigo-600 opacity-60 text-white cursor-wait",
    success: "bg-green-600 text-white",
    empty:   "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
  };

  return (
    <button
      onClick={handleExport}
      disabled={state === "loading" || state === "empty"}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${colours[state]}`}
    >
      <Download size={15} />
      {labels[state]}
    </button>
  );
}