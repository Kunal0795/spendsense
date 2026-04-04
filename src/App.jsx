import { useApp } from "./contexts/AppContext.jsx";
import Layout from "./components/layout/Layout.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";

export default function App() {
  const { page } = useApp();

  return (
    <Layout>
      {page === "dashboard" && <Dashboard />}
    </Layout>
  );
}