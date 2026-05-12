import { FaSearch, FaBell, FaMoon, FaBars } from "react-icons/fa";

export default function Topbar({ onMenuClick }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const displayName = user?.name || "Admin";

  return (
    <div className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm lg:hidden"
            aria-label="Open sidebar"
          >
            <FaBars />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">Dashboard</h2>
            <p className="text-xs text-gray-500 sm:text-sm">
              Welcome back! Here's what's happening today.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          <div className="flex w-full items-center rounded-xl bg-gray-100 px-3 py-2 sm:max-w-xs">
            <FaSearch className="mr-2 shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full min-w-0 bg-transparent text-sm outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:justify-end">
            <button className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm text-white shadow sm:w-auto">
              + New
            </button>

            <div className="flex items-center gap-3 text-gray-500">
              <button type="button" className="rounded-full p-2 hover:bg-gray-100" aria-label="Theme">
                <FaMoon className="cursor-pointer" />
              </button>
              <button type="button" className="rounded-full p-2 hover:bg-gray-100" aria-label="Notifications">
                <FaBell className="cursor-pointer" />
              </button>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gray-300"></div>
              <span className="truncate text-sm font-medium capitalize">{displayName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
