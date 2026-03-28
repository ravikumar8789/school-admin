import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";

const nav = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/students", label: "Students" },
  { to: "/classes", label: "Academic" },
  { to: "/attendance", label: "Attendance" },
  { to: "/fees", label: "Fees" },
  { to: "/results", label: "Results" },
  { to: "/documents", label: "Documents" },
  { to: "/promotions", label: "Promotion" },
  { to: "/reports", label: "Reports" },
  { to: "/notifications", label: "Notifications" },
  { to: "/settings", label: "Settings" },
];

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const {
    schoolDisplayName,
    preferredAcademicYearId,
    setPreferredAcademicYearId,
    years,
    yearsLoading,
  } = usePreferences();

  const brand = schoolDisplayName?.trim() || "School Admin";

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{brand}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {nav.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                ].join(" ")
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-2 dark:border-slate-700">
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Log out
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Admin dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{brand}</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Working academic year
            </label>
            <select
              value={preferredAcademicYearId}
              onChange={(e) => setPreferredAcademicYearId(e.target.value)}
              disabled={yearsLoading}
              className="min-w-[12rem] rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800"
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-slate-50 p-6 dark:bg-slate-950 dark:text-slate-100">
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          School Management System
        </footer>
      </div>
    </div>
  );
}
