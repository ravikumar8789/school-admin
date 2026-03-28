import { supabase } from "../supabaseClient";

export async function fetchAcademicOverview() {
  const { data, error } = await supabase
    .from("academic_years")
    .select(
      `
      id,
      name,
      start_date,
      end_date,
      is_active,
      status,
      classes (
        id,
        name,
        display_order,
        sections ( id, name, display_order )
      )
    `
    )
    .order("start_date", { ascending: false });

  if (error) {
    return { years: null, error };
  }

  const sorted = (data ?? []).map((y) => ({
    ...y,
    classes: [...(y.classes ?? [])].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    ),
  }));

  return { years: sorted, error: null };
}

export async function listAcademicYears() {
  return supabase
    .from("academic_years")
    .select("*")
    .order("start_date", { ascending: false });
}

export async function insertAcademicYear(row) {
  return supabase.from("academic_years").insert(row).select().single();
}

export async function updateAcademicYear(id, row) {
  return supabase.from("academic_years").update(row).eq("id", id).select().single();
}

export async function deleteAcademicYear(id) {
  return supabase.from("academic_years").delete().eq("id", id);
}

export async function listClassesForYear(academicYearId) {
  return supabase
    .from("classes")
    .select("*")
    .eq("academic_year_id", academicYearId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
}

export async function insertClass(row) {
  return supabase.from("classes").insert(row).select().single();
}

export async function updateClass(id, row) {
  return supabase.from("classes").update(row).eq("id", id).select().single();
}

export async function deleteClass(id) {
  return supabase.from("classes").delete().eq("id", id);
}

export async function listSectionsForClass(classId) {
  return supabase
    .from("sections")
    .select("*")
    .eq("class_id", classId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
}

export async function insertSection(row) {
  return supabase.from("sections").insert(row).select().single();
}

export async function updateSection(id, row) {
  return supabase.from("sections").update(row).eq("id", id).select().single();
}

export async function deleteSection(id) {
  return supabase.from("sections").delete().eq("id", id);
}

export async function listSubjects() {
  return supabase.from("subjects").select("*").order("name", { ascending: true });
}

export async function insertSubject(row) {
  return supabase.from("subjects").insert(row).select().single();
}

export async function updateSubject(id, row) {
  return supabase.from("subjects").update(row).eq("id", id).select().single();
}

export async function deleteSubject(id) {
  return supabase.from("subjects").delete().eq("id", id);
}

export async function listClassSubjects(academicYearId, classId) {
  return supabase
    .from("class_subjects")
    .select("id, subject_id, subjects ( id, name, code )")
    .eq("academic_year_id", academicYearId)
    .eq("class_id", classId)
    .order("subject_id");
}

export async function insertClassSubject(row) {
  return supabase.from("class_subjects").insert(row).select().single();
}

export async function deleteClassSubject(id) {
  return supabase.from("class_subjects").delete().eq("id", id);
}
