import { supabase } from "../supabaseClient";

export async function fetchDashboardStats() {
  const [
    students,
    classes,
    subjects,
    academicYears,
    pendingFees,
    exams,
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("classes").select("*", { count: "exact", head: true }),
    supabase.from("subjects").select("*", { count: "exact", head: true }),
    supabase.from("academic_years").select("*", { count: "exact", head: true }),
    supabase
      .from("student_fees")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "partial"]),
    supabase.from("exams").select("*", { count: "exact", head: true }),
  ]);

  const err =
    students.error ||
    classes.error ||
    subjects.error ||
    academicYears.error ||
    pendingFees.error ||
    exams.error;

  if (err) {
    return { error: err, stats: null };
  }

  return {
    error: null,
    stats: {
      students: students.count ?? 0,
      classes: classes.count ?? 0,
      subjects: subjects.count ?? 0,
      academicYears: academicYears.count ?? 0,
      pendingFees: pendingFees.count ?? 0,
      exams: exams.count ?? 0,
    },
  };
}
