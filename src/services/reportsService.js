import { listStudents } from "./studentService";
import { fetchAttendanceReport } from "./attendanceService";
import { listStudentFees } from "./feesService";
import { listResultsForExam } from "./examService";

export async function getStudentReportRows({ academicYearId, classId, sectionId }) {
  const { data, error } = await listStudents({
    academicYearId: academicYearId || undefined,
    classId: classId || undefined,
    sectionId: sectionId || undefined,
  });

  if (error) return { rows: null, error };

  const rows = (data ?? []).map((s) => ({
    code: s.student_code,
    name: s.full_name,
    gender: s.gender ?? "",
    dob: s.dob ?? "",
    phone: s.phone ?? "",
    class_name: s.classes?.name ?? "",
    section_name: s.sections?.name ?? "",
    year_name: s.academic_years?.name ?? "",
    admission: s.admission_date ?? "",
  }));

  return { rows, error: null };
}

export async function getAttendanceReportRows({ fromDate, toDate, academicYearId }) {
  const { data, error } = await fetchAttendanceReport({
    fromDate,
    toDate,
    academicYearId: academicYearId || undefined,
  });

  if (error) return { rows: null, error };

  const rows = (data ?? []).map((row) => ({
    date: row.attendance_date,
    code: row.students?.student_code ?? "",
    name: row.students?.full_name ?? "",
    status: row.status,
    notes: row.notes ?? "",
  }));

  return { rows, error: null };
}

export async function getFeesReportRows({ academicYearId }) {
  const res = await listStudentFees({
    academicYearId: academicYearId || undefined,
  });

  if (res.error) return { rows: null, error: res.error };

  const rows = (res.data ?? []).map((r) => ({
    student_code: r.students?.student_code ?? "",
    student_name: r.students?.full_name ?? "",
    fee_name: r.fee_structures?.name ?? "",
    amount_due: r.amount_due,
    amount_paid: r.amount_paid,
    status: r.status,
    balance: Number(r.amount_due) - Number(r.amount_paid),
  }));

  return { rows, error: null };
}

export async function getExamResultsReportRows(examId) {
  if (!examId) return { rows: [], error: null };

  const { data, error } = await listResultsForExam(examId);
  if (error) return { rows: null, error };

  const rows = (data ?? []).map((r) => ({
    rank: r.rank_in_class ?? "",
    code: r.students?.student_code ?? "",
    name: r.students?.full_name ?? "",
    total_marks: r.total_marks ?? "",
    percentage: r.percentage ?? "",
    grade: r.grades?.name ?? "",
  }));

  return { rows, error: null };
}
