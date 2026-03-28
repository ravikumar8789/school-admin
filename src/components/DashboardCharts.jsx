import { monthLabels } from "../services/analyticsService";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function shortMonthLabel(ym) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString(undefined, { month: "short", year: "2-digit" });
}

/** Ensure dataset length matches category count (Chart.js needs aligned arrays). */
function padToLen(arr, len, filler) {
  const base = Array.isArray(arr) ? [...arr] : [];
  const out = base.slice(0, len);
  while (out.length < len) out.push(filler);
  return out;
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: "top" },
  },
};

export function DashboardCharts({
  admissions,
  attendancePct,
  feeCollection,
}) {
  const rawLabels =
    (admissions?.labels?.length ? admissions.labels : null) ||
    (attendancePct?.labels?.length ? attendancePct.labels : null) ||
    (feeCollection?.labels?.length ? feeCollection.labels : null) ||
    monthLabels(12);
  const labels = rawLabels.map(shortMonthLabel);

  const admissionsData = {
    labels,
    datasets: [
      {
        label: "New students (by month)",
        data: padToLen(admissions?.values, labels.length, 0),
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        borderRadius: 4,
      },
    ],
  };

  const attendanceData = {
    labels,
    datasets: [
      {
        label: "Attendance % (of marked days)",
        data: padToLen(attendancePct?.values, labels.length, null).map((v) =>
          v == null ? null : v
        ),
        borderColor: "rgb(22, 163, 74)",
        backgroundColor: "rgba(22, 163, 74, 0.08)",
        tension: 0.25,
        fill: true,
        spanGaps: false,
      },
    ],
  };

  const feeData = {
    labels,
    datasets: [
      {
        label: "Fee payments (total amount)",
        data: padToLen(feeCollection?.values, labels.length, 0),
        borderColor: "rgb(37, 99, 235)",
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        tension: 0.2,
        fill: true,
      },
    ],
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Student admissions</h3>
        <p className="text-xs text-slate-500">Registrations by calendar month</p>
        <div className="mt-3 h-56">
          <Bar data={admissionsData} options={chartOptions} />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Attendance rate</h3>
        <p className="text-xs text-slate-500">
          % present vs total marks for the selected academic year
        </p>
        <div className="mt-3 h-56">
          <Line
            data={attendanceData}
            options={{
              ...chartOptions,
              scales: {
                y: {
                  min: 0,
                  max: 100,
                  ticks: { callback: (v) => `${v}%` },
                },
              },
            }}
          />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm lg:col-span-2">
        <h3 className="text-sm font-semibold text-slate-900">Fee collection</h3>
        <p className="text-xs text-slate-500">Sum of payment amounts by month</p>
        <div className="mt-3 h-56">
          <Line data={feeData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
