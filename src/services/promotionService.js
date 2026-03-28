import { supabase } from "../supabaseClient";
import { logAdminActivity } from "./activityLogService";

export async function listPromotableStudents(academicYearId, classId, sectionId) {
  let q = supabase
    .from("students")
    .select(
      `
      id,
      student_code,
      full_name,
      academic_year_id,
      class_id,
      section_id,
      classes ( name ),
      sections ( name ),
      academic_years ( name )
    `
    )
    .order("full_name", { ascending: true });

  if (academicYearId) q = q.eq("academic_year_id", academicYearId);
  if (classId) q = q.eq("class_id", classId);
  if (sectionId) q = q.eq("section_id", sectionId);

  return q;
}

export async function promoteStudents({
  studentIds,
  toAcademicYearId,
  toClassId,
  toSectionId,
  performedBy,
}) {
  const errors = [];

  for (const studentId of studentIds) {
    const { data: st, error: gErr } = await supabase
      .from("students")
      .select(
        "id, academic_year_id, class_id, section_id"
      )
      .eq("id", studentId)
      .single();

    if (gErr || !st) {
      errors.push(`${studentId}: ${gErr?.message ?? "not found"}`);
      continue;
    }

    const { error: pErr } = await supabase.from("student_promotions").insert({
      student_id: studentId,
      from_academic_year_id: st.academic_year_id,
      to_academic_year_id: toAcademicYearId,
      from_class_id: st.class_id,
      to_class_id: toClassId,
      from_section_id: st.section_id,
      to_section_id: toSectionId || null,
      performed_by: performedBy ?? null,
      notes: null,
      rolled_back: false,
    });

    if (pErr) {
      errors.push(`${studentId}: ${pErr.message}`);
      continue;
    }

    const { error: uErr } = await supabase
      .from("students")
      .update({
        academic_year_id: toAcademicYearId,
        class_id: toClassId,
        section_id: toSectionId || null,
      })
      .eq("id", studentId);

    if (uErr) {
      errors.push(`${studentId}: ${uErr.message}`);
    }
  }

  return { errors };
}

export async function listPromotionHistory(limit = 100) {
  return await supabase
    .from("student_promotions")
    .select(
      `
      id,
      student_id,
      from_academic_year_id,
      to_academic_year_id,
      from_class_id,
      to_class_id,
      from_section_id,
      to_section_id,
      promoted_at,
      rolled_back,
      notes,
      students ( student_code, full_name )
    `
    )
    .order("promoted_at", { ascending: false })
    .limit(limit);
}

/**
 * Reverts student class/year/section to the "from_*" snapshot; marks row rolled_back.
 */
export async function rollbackPromotion(promotionId) {
  const { data: p, error: gErr } = await supabase
    .from("student_promotions")
    .select("*")
    .eq("id", promotionId)
    .single();

  if (gErr || !p) {
    return { error: gErr ?? { message: "Promotion not found" } };
  }

  if (p.rolled_back) {
    return { error: { message: "Already rolled back." } };
  }

  const { error: uErr } = await supabase
    .from("students")
    .update({
      academic_year_id: p.from_academic_year_id,
      class_id: p.from_class_id,
      section_id: p.from_section_id,
    })
    .eq("id", p.student_id);

  if (uErr) return { error: uErr };

  const { error: rErr } = await supabase
    .from("student_promotions")
    .update({ rolled_back: true })
    .eq("id", promotionId);

  if (!rErr) {
    void logAdminActivity({
      action: "student.promote_rollback",
      entityType: "student_promotion",
      entityId: promotionId,
      summary: `Student ${p.student_id}`,
    });
  }

  return { error: rErr };
}
