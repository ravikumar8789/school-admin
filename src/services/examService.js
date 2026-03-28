import { supabase } from "../supabaseClient";

const examSelect = `
  id,
  name,
  exam_type,
  start_date,
  end_date,
  academic_year_id,
  class_id,
  academic_years ( id, name ),
  classes ( id, name )
`;

export async function listExams(academicYearId) {
  let q = supabase.from("exams").select(examSelect).order("created_at", { ascending: false });
  if (academicYearId) q = q.eq("academic_year_id", academicYearId);
  return q;
}

export async function insertExam(row) {
  return supabase.from("exams").insert(row).select(examSelect).single();
}

export async function updateExam(id, row) {
  return supabase.from("exams").update(row).eq("id", id).select(examSelect).single();
}

export async function deleteExam(id) {
  return supabase.from("exams").delete().eq("id", id);
}

export async function listExamSubjects(examId) {
  return supabase
    .from("exam_subjects")
    .select(
      `
      id,
      exam_id,
      subject_id,
      max_marks,
      pass_marks,
      subjects ( id, name, code )
    `
    )
    .eq("exam_id", examId)
    .order("id", { ascending: true });
}

export async function insertExamSubject(row) {
  return supabase.from("exam_subjects").insert(row).select().single();
}

export async function deleteExamSubject(id) {
  return supabase.from("exam_subjects").delete().eq("id", id);
}

export async function listGrades(academicYearId) {
  let q = supabase
    .from("grades")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (academicYearId) {
    q = q.or(`academic_year_id.eq.${academicYearId},academic_year_id.is.null`);
  }
  return q;
}

export async function insertGrade(row) {
  return supabase.from("grades").insert(row).select().single();
}

export async function updateGrade(id, row) {
  return supabase.from("grades").update(row).eq("id", id).select().single();
}

export async function deleteGrade(id) {
  return supabase.from("grades").delete().eq("id", id);
}

export async function fetchExamWithMeta(examId) {
  return supabase
    .from("exams")
    .select("id, academic_year_id, class_id, name, academic_years ( id, name ), classes ( id, name )")
    .eq("id", examId)
    .single();
}

export async function fetchMarksMatrix(examId) {
  const { data: subs, error: e1 } = await listExamSubjects(examId);
  if (e1) return { subjects: null, marksByStudent: null, error: e1 };
  const subIds = (subs ?? []).map((s) => s.id);
  if (!subIds.length) {
    return { subjects: subs ?? [], marksByStudent: {}, error: null };
  }

  const { data: marks, error: e2 } = await supabase
    .from("marks")
    .select("student_id, exam_subject_id, marks_obtained")
    .in("exam_subject_id", subIds);

  if (e2) return { subjects: subs, marksByStudent: null, error: e2 };

  const marksByStudent = {};
  (marks ?? []).forEach((m) => {
    if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = {};
    marksByStudent[m.student_id][m.exam_subject_id] = m.marks_obtained;
  });

  return { subjects: subs ?? [], marksByStudent, error: null };
}

export async function upsertMarks(rows) {
  if (!rows.length) return { error: null };
  return supabase.from("marks").upsert(rows, {
    onConflict: "exam_subject_id,student_id",
  });
}

export async function listResultsForExam(examId) {
  return supabase
    .from("results")
    .select(
      `
      id,
      total_marks,
      percentage,
      rank_in_class,
      grade_id,
      student_id,
      students ( student_code, full_name ),
      grades ( id, name )
    `
    )
    .eq("exam_id", examId)
    .order("rank_in_class", { ascending: true, nullsFirst: false });
}

/**
 * Includes all students in the exam's class & year; missing marks count as 0.
 */
export async function recalculateResultsForExam(examId) {
  const { data: exam, error: exErr } = await supabase
    .from("exams")
    .select("id, academic_year_id, class_id")
    .eq("id", examId)
    .single();

  if (exErr || !exam) {
    return { error: exErr ?? { message: "Exam not found" } };
  }

  const { data: subs, error: sErr } = await supabase
    .from("exam_subjects")
    .select("id, max_marks")
    .eq("exam_id", examId);

  if (sErr) return { error: sErr };

  const totalMax = (subs ?? []).reduce((a, s) => a + Number(s.max_marks), 0);
  if (totalMax <= 0) {
    return { error: { message: "Add at least one subject with max marks to the exam." } };
  }

  const subIds = (subs ?? []).map((s) => s.id);

  const { data: roster, error: rErr } = await supabase
    .from("students")
    .select("id")
    .eq("academic_year_id", exam.academic_year_id)
    .eq("class_id", exam.class_id);

  if (rErr) return { error: rErr };

  const { data: markRows, error: mErr } = await supabase
    .from("marks")
    .select("student_id, exam_subject_id, marks_obtained")
    .in("exam_subject_id", subIds);

  if (mErr) return { error: mErr };

  const obtainedByStudent = {};
  (markRows ?? []).forEach((m) => {
    const v = Number(m.marks_obtained);
    obtainedByStudent[m.student_id] =
      (obtainedByStudent[m.student_id] ?? 0) + (Number.isFinite(v) ? v : 0);
  });

  const { data: gradeRows, error: gErr } = await supabase
    .from("grades")
    .select("*")
    .or(`academic_year_id.eq.${exam.academic_year_id},academic_year_id.is.null`)
    .order("sort_order", { ascending: true });

  if (gErr) return { error: gErr };
  const grades = gradeRows ?? [];

  function pickGrade(pct) {
    return grades.find(
      (gr) =>
        Number(gr.min_percent) <= pct && pct <= Number(gr.max_percent)
    );
  }

  const students = roster ?? [];
  const results = students.map((s) => {
    const obtained = obtainedByStudent[s.id] ?? 0;
    const pct = (obtained / totalMax) * 100;
    const rounded = Math.round(pct * 100) / 100;
    const g = pickGrade(rounded);
    return {
      student_id: s.id,
      exam_id: examId,
      total_marks: obtained,
      percentage: rounded,
      grade_id: g?.id ?? null,
    };
  });

  results.sort((a, b) => b.percentage - a.percentage);
  results.forEach((row, idx) => {
    row.rank_in_class = idx + 1;
  });

  return supabase.from("results").upsert(results, {
    onConflict: "student_id,exam_id",
  });
}
