import Sidebar from "./Sidebar";

export default function Layout({ children, onAdd }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">

      {/* Sidebar — hidden on mobile, visible on md+ */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-end mb-4 pt-5">
            <button
              onClick={onAdd}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Transaction
            </button>
          </div>
          {children}
        </div>
      </main>

      {/* Bottom nav — visible on mobile only */}
      <div className="md:hidden">
        <Sidebar mobile />
      </div>

    </div>
  );
}
