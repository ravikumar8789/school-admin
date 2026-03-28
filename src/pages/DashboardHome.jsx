import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboardStats } from "../services/dashboardService";
import { listRecentNotifications } from "../services/notificationService";
import {
  fetchAdmissionsByMonth,
  fetchAttendancePercentByMonth,
  fetchFeeCollectionByMonth,
  getLatestAcademicYearId,
} from "../services/analyticsService";
import { listYearsOptions } from "../services/studentService";
import { DashboardCharts } from "../components/DashboardCharts";

const cards = [
  { key: "students", label: "Students" },
  { key: "classes", label: "Classes" },
  { key: "subjects", label: "Subjects" },
  { key: "academicYears", label: "Academic years" },
  { key: "pendingFees", label: "Pending / partial fees" },
  { key: "exams", label: "Exams" },
];

export function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [chartYearId, setChartYearId] = useState("");
  const [years, setYears] = useState([]);
  const [chartData, setChartData] = useState({
    admissions: { labels: [], values: [] },
    attendance: { labels: [], values: [] },
    fees: { labels: [], values: [] },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [{ stats: s, error: err }, { data: notes }, latest] = await Promise.all([
        fetchDashboardStats(),
        listRecentNotifications(6),
        getLatestAcademicYearId(),
      ]);
      if (cancelled) return;
      if (err) {
        setError(err);
        setStats(null);
      } else {
        setStats(s);
      }
      setNotifications(notes ?? []);
      setChartYearId(latest.yearId ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      const [{ data: allYears }, adm, att, fees] = await Promise.all([
        listYearsOptions(),
        fetchAdmissionsByMonth(12),
        fetchAttendancePercentByMonth(chartYearId || null, 12),
        fetchFeeCollectionByMonth(12),
      ]);
      if (c) return;
      setYears(allYears ?? []);
      setChartData({
        admissions:
          adm.error || !adm.values
            ? { labels: adm.labels ?? [], values: [] }
            : adm,
        attendance:
          att.error || !att.values
            ? { labels: att.labels ?? [], values: [] }
            : att,
        fees:
          fees.error || !fees.values
            ? { labels: fees.labels ?? [], values: [] }
            : fees,
      });
    })();
    return () => {
      c = true;
    };
  }, [chartYearId]);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading dashboard…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-600">
        Overview metrics and the last 12 months of admissions, attendance (for the year
        below), and fee payments.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-700">Attendance chart academic year</label>
        <select
          value={chartYearId}
          onChange={(e) => setChartYearId(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
        >
          <option value="">— Select year —</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {stats?.[key] ?? "—"}
            </p>
          </div>
        ))}
      </div>

      <DashboardCharts
        admissions={chartData.admissions}
        attendancePct={chartData.attendance}
        feeCollection={chartData.fees}
      />

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Recent announcements</h2>
          <Link
            to="/notifications"
            className="text-sm font-medium text-slate-700 underline hover:text-slate-900"
          >
            Manage
          </Link>
        </div>
        {notifications.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {notifications.map((n) => (
              <li key={n.id} className="py-2 first:pt-0">
                <p className="font-medium text-slate-900">{n.title}</p>
                {n.body ? (
                  <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">{n.body}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-400">
                  {n.notification_type}
                  {n.created_at
                    ? ` · ${new Date(n.created_at).toLocaleDateString()}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
