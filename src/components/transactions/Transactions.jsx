import { useEffect, useState } from "react";
import { db } from "../../db/index.js";
import { CAT_MAP } from "../../constants/categories.js";
import { Trash2 } from "lucide-react";
import { useApp } from "../../contexts/AppContext.jsx";

export default function Transactions() {
  const { currency } = useApp();
  const [txns, setTxns] = useState([]);

  async function load() {
    const all = await db.transactions.orderBy("date").reverse().toArray();
    setTxns(all);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    await db.transactions.delete(id);
    load();
  }

  const fmt = (n) => `${currency === "INR" ? "₹" : "$"}${n.toLocaleString("en-IN")}`;

  const fmtDate = (ts) => new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Transactions</h2>

      {txns.length === 0 ? (
        <p className="text-gray-500 text-sm">No transactions yet.</p>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
          {txns.map(t => {
            const cat = CAT_MAP[t.category];
            return (
              <div key={t.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{cat?.emoji || "💸"}</div>
                  <div>
                    <p className="text-white text-sm font-medium">{t.merchant}</p>
                    <p className="text-gray-500 text-xs">{cat?.label || "Uncategorized"} · {t.source} · {fmtDate(t.date)}</p>
                    {t.note && <p className="text-gray-600 text-xs italic">{t.note}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-semibold ${t.isDebit ? "text-red-400" : "text-green-400"}`}>
                    {t.isDebit ? "-" : "+"}{fmt(t.amount)}
                  </span>
                  <button onClick={() => handleDelete(t.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}