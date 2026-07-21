import { FaSearch, FaBell, FaMoon, FaSun, FaBars } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";

export default function Topbar({ onMenuClick }) {
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();
  const displayName = user?.name || "Admin";
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:hidden"
            aria-label="Open sidebar"
          >
            <FaBars />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100 sm:text-lg">Business Operations</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 sm:text-sm">
             Manage products, inventory, orders, customers, vendors, and finances.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          <div className="flex w-full items-center rounded-xl bg-gray-100 px-3 py-2 dark:bg-slate-800 sm:max-w-xs">
            <FaSearch className="mr-2 shrink-0 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full min-w-0 bg-transparent text-sm text-gray-900 outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:justify-end">


            <div className="flex items-center gap-3 text-gray-500 dark:text-slate-400">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Toggle dark mode"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <FaSun className="cursor-pointer text-amber-400" /> : <FaMoon className="cursor-pointer" />}
              </button>
              <button type="button" className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Notifications">
                <FaBell className="cursor-pointer" />
              </button>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gray-300 dark:bg-slate-700"></div>
              <span className="truncate text-sm font-medium capitalize text-gray-900 dark:text-slate-100">{displayName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
