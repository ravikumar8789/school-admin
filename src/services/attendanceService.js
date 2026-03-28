import { supabase } from "../supabaseClient";
import { logAdminActivity } from "./activityLogService";

export async function fetchRoster(academicYearId, classId, sectionId) {
  let q = supabase
    .from("students")
    .select("id, student_code, full_name")
    .order("full_name", { ascending: true });

  if (academicYearId) q = q.eq("academic_year_id", academicYearId);
  if (classId) q = q.eq("class_id", classId);
  if (sectionId) q = q.eq("section_id", sectionId);

  return q;
}

export async function fetchAttendanceForDate(attendanceDate, academicYearId) {
  let q = supabase
    .from("attendance")
    .select("id, student_id, status, notes")
    .eq("attendance_date", attendanceDate);

  if (academicYearId) q = q.eq("academic_year_id", academicYearId);

  const { data, error } = await q;
  if (error) return { map: {}, error };

  const map = {};
  (data ?? []).forEach((row) => {
    map[row.student_id] = row;
  });
  return { map, error: null };
}

export async function upsertAttendanceRows(rows) {
  if (!rows.length) return { error: null };
  const res = await supabase.from("attendance").upsert(rows, {
    onConflict: "student_id,attendance_date",
  });
  if (!res.error) {
    const d0 = rows[0]?.attendance_date;
    void logAdminActivity({
      action: "attendance.save",
      summary: `${rows.length} mark(s)${d0 ? ` @ ${d0}` : ""}`,
      metadata: { count: rows.length, date: d0 ?? null },
    });
  }
  return res;
}

export async function fetchAttendanceReport({ fromDate, toDate, academicYearId }) {
  let q = supabase
    .from("attendance")
    .select(
      `
      attendance_date,
      status,
      notes,
      students ( student_code, full_name )
    `
    )
    .gte("attendance_date", fromDate)
    .lte("attendance_date", toDate)
    .order("attendance_date", { ascending: true });

  if (academicYearId) q = q.eq("academic_year_id", academicYearId);

  return q;
}
