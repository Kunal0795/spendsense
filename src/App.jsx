import { useState } from "react";
import { useApp } from "./contexts/AppContext.jsx";
import Layout from "./components/layout/Layout.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import Transactions from "./components/transactions/Transactions.jsx";
import AddTransaction from "./components/transactions/AddTransaction.jsx";
import Analytics from "./components/analytics/Analytics.jsx";
import Budgets from "./components/budgets/Budgets.jsx";
import Subscriptions from "./components/subscriptions/Subscriptions.jsx";
import SmsImport from "./components/sms/SmsImport.jsx";

export default function App() {
  const { page } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <Layout onAdd={() => setShowAdd(true)}>
      {page === "dashboard" && <Dashboard key={showAdd} />}
      {page === "transactions" && <Transactions key={showAdd} />}
      {page === "analytics" && <Analytics />}
      {page === "budgets" && <Budgets />}
      {page === "subscriptions" && <Subscriptions />}
      {page === "sms" && <SmsImport />}
      {showAdd && (
        <AddTransaction
          onClose={() => setShowAdd(false)}
          onAdded={() => setShowAdd(false)}
        />
      )}
    </Layout>
  );
}