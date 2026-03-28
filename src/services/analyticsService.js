import { supabase } from "../supabaseClient";

/** Last N calendar months as 'YYYY-MM' labels (oldest first). */
export function monthLabels(count = 12) {
  const labels = [];
  const d = new Date();
  d.setDate(1);
  for (let i = count - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    labels.push(
      `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return labels;
}

function monthKeyFromIso(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Count students created in each of the last `monthCount` months.
 */
export async function fetchAdmissionsByMonth(monthCount = 12) {
  const labels = monthLabels(monthCount);
  const start = `${labels[0]}-01T00:00:00.000Z`;
  const { data, error } = await supabase
    .from("students")
    .select("created_at")
    .gte("created_at", start);

  if (error) return { labels, values: null, error };

  const counts = Object.fromEntries(labels.map((k) => [k, 0]));
  (data ?? []).forEach((row) => {
    const k = monthKeyFromIso(row.created_at);
    if (counts[k] !== undefined) counts[k] += 1;
  });
  return { labels, values: labels.map((k) => counts[k]), error: null };
}

export async function getLatestAcademicYearId() {
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, name, start_date")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { yearId: data?.id ?? null, year: data, error };
}

/**
 * Per-month attendance % (present / total rows) for an academic year.
 */
export async function fetchAttendancePercentByMonth(
  academicYearId,
  monthCount = 12
) {
  if (!academicYearId) {
    return { labels: monthLabels(monthCount), values: null, error: null };
  }

  const labels = monthLabels(monthCount);
  const start = `${labels[0]}-01`;

  const { data, error } = await supabase
    .from("attendance")
    .select("attendance_date, status")
    .eq("academic_year_id", academicYearId)
    .gte("attendance_date", start);

  if (error) return { labels, values: null, error };

  const total = Object.fromEntries(labels.map((k) => [k, 0]));
  const present = Object.fromEntries(labels.map((k) => [k, 0]));

  (data ?? []).forEach((row) => {
    const k = row.attendance_date?.slice(0, 7);
    if (!k || total[k] === undefined) return;
    total[k] += 1;
    if (row.status === "present") present[k] += 1;
  });

  const values = labels.map((k) => {
    const t = total[k];
    if (!t) return null;
    return Math.round((present[k] / t) * 1000) / 10;
  });

  return { labels, values, error: null };
}

/**
 * Sum payment amounts by calendar month (paid_at).
 */
export async function fetchFeeCollectionByMonth(monthCount = 12) {
  const labels = monthLabels(monthCount);
  const start = `${labels[0]}-01T00:00:00.000Z`;

  const { data, error } = await supabase
    .from("payments")
    .select("paid_at, amount")
    .gte("paid_at", start);

  if (error) return { labels, values: null, error };

  const sums = Object.fromEntries(labels.map((k) => [k, 0]));
  (data ?? []).forEach((row) => {
    const k = monthKeyFromIso(row.paid_at);
    if (sums[k] !== undefined) {
      sums[k] += Number(row.amount) || 0;
    }
  });

  return {
    labels,
    values: labels.map((k) => Math.round(sums[k] * 100) / 100),
    error: null,
  };
}
