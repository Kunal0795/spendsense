import Sidebar from "./Sidebar";

export default function Layout({ children, onAdd }) {
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex justify-end mb-4">
          <button
            onClick={onAdd}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Add Transaction
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}