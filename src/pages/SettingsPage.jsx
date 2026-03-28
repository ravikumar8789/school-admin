import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { listAdminActivity } from "../services/activityLogService";

export function SettingsPage() {
  const { user } = useAuth();
  const {
    schoolDisplayName,
    setSchoolDisplayName,
    preferredAcademicYearId,
    setPreferredAcademicYearId,
    years,
    yearsLoading,
    theme,
    setTheme,
  } = usePreferences();

  const [localSchool, setLocalSchool] = useState(schoolDisplayName);
  const [saved, setSaved] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityErr, setActivityErr] = useState(null);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    setLocalSchool(schoolDisplayName);
  }, [schoolDisplayName]);

  useEffect(() => {
    let c = false;
    (async () => {
      setActivityLoading(true);
      setActivityErr(null);
      const { data, error } = await listAdminActivity({ limit: 100 });
      if (c) return;
      if (error) {
        setActivityErr(error.message);
        setActivity([]);
      } else {
        setActivity(data ?? []);
      }
      setActivityLoading(false);
    })();
    return () => {
      c = true;
    };
  }, []);

  function saveBranding(ev) {
    ev.preventDefault();
    setSchoolDisplayName(localSchool.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Branding and default academic year apply across the admin area (sidebar, filters, and
        reports). Preferences are stored in this browser only.
      </p>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Appearance</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Dark mode uses the system &ldquo;class&rdquo; strategy (saved as{" "}
          <span className="font-mono text-[11px]">sms_theme</span>).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </section>

      <form
        onSubmit={saveBranding}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">School branding</h2>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Display name</label>
          <input
            value={localSchool}
            onChange={(e) => setLocalSchool(e.target.value)}
            placeholder="e.g. Riverside Public School"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Shown in the sidebar, header, and fee receipt PDFs. Leave blank for the default label.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Save branding
        </button>
        {saved ? (
          <p className="text-sm text-green-700 dark:text-green-400">Saved.</p>
        ) : null}
      </form>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Default academic year</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Used as the initial choice on Students, Attendance, Fees, Documents, Results filters,
          and in the top bar. Choose “All” to clear the default.
        </p>
        <select
          value={preferredAcademicYearId}
          onChange={(e) => setPreferredAcademicYearId(e.target.value)}
          disabled={yearsLoading}
          className="block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
        >
          <option value="">All years (no default)</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Account</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Signed in as <span className="font-mono text-xs">{user?.email ?? "—"}</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Password and email changes are managed in Supabase Auth (e.g. reset link from the login
          screen if your project enables it).
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Activity log</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Recent admin actions (students, attendance, fees, promotions). Requires running{" "}
            <span className="font-mono text-[11px]">tables_queries_phase8_optional.sql</span> in
            Supabase.
          </p>
        </div>
        {activityLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
        ) : activityErr ? (
          <p className="text-sm text-amber-800 dark:text-amber-200">{activityErr}</p>
        ) : !activity.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No entries yet.</p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70">
                <tr className="text-slate-600 dark:text-slate-400">
                  <th className="px-2 py-2">When</th>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Summary</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-600 dark:text-slate-400">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-slate-800 dark:text-slate-200">
                      {row.action}
                    </td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">
                      {row.summary ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
