import { supabase } from "../supabaseClient";
import { logAdminActivity } from "./activityLogService";

const studentSelect = `
  id,
  student_code,
  full_name,
  dob,
  gender,
  address,
  phone,
  admission_date,
  guardian_id,
  class_id,
  section_id,
  academic_year_id,
  profile_photo_path,
  created_at,
  guardians ( id, full_name, phone, email, relation_to_student ),
  classes ( id, name ),
  sections ( id, name ),
  academic_years ( id, name )
`;

export async function listStudents({ academicYearId, classId, sectionId, search }) {
  let q = supabase
    .from("students")
    .select(studentSelect, { count: "exact" })
    .order("full_name", { ascending: true });

  if (academicYearId) q = q.eq("academic_year_id", academicYearId);
  if (classId) q = q.eq("class_id", classId);
  if (sectionId) q = q.eq("section_id", sectionId);
  if (search?.trim()) {
    const t = search.trim().replace(/%/g, "").replace(/,/g, "");
    if (t) {
      q = q.or(`full_name.ilike.%${t}%,student_code.ilike.%${t}%`);
    }
  }

  return q;
}

export async function getStudentById(id) {
  return supabase.from("students").select(studentSelect).eq("id", id).maybeSingle();
}

async function upsertGuardian(guardianId, fields) {
  const row = {
    full_name: fields.full_name.trim(),
    phone: fields.phone?.trim() || null,
    email: fields.email?.trim() || null,
    relation_to_student: fields.relation_to_student?.trim() || null,
  };

  if (guardianId) {
    const { data, error } = await supabase
      .from("guardians")
      .update(row)
      .eq("id", guardianId)
      .select("id")
      .single();
    return { id: data?.id ?? guardianId, error };
  }

  const { data, error } = await supabase.from("guardians").insert(row).select("id").single();
  return { id: data?.id ?? null, error };
}

export async function createStudent(form, guardianFields) {
  let guardianId = null;
  const gName = guardianFields?.full_name?.trim();
  if (gName) {
    const { id, error } = await upsertGuardian(null, { ...guardianFields, full_name: gName });
    if (error) return { data: null, error };
    guardianId = id;
  }

  const row = {
    full_name: form.full_name.trim(),
    dob: form.dob || null,
    gender: form.gender || null,
    address: form.address?.trim() || null,
    phone: form.phone?.trim() || null,
    admission_date: form.admission_date || null,
    class_id: form.class_id || null,
    section_id: form.section_id || null,
    academic_year_id: form.academic_year_id || null,
    guardian_id: guardianId,
    profile_photo_path: form.profile_photo_path?.trim() || null,
  };

  const res = await supabase.from("students").insert(row).select(studentSelect).single();
  if (!res.error && res.data?.id) {
    void logAdminActivity({
      action: "student.create",
      entityType: "student",
      entityId: res.data.id,
      summary: res.data.full_name,
    });
  }
  return res;
}

export async function updateStudent(studentId, form, guardianFields, existingGuardianId) {
  const gName = guardianFields?.full_name?.trim();
  let guardianId = null;

  if (gName) {
    const { id, error } = await upsertGuardian(existingGuardianId ?? null, {
      ...guardianFields,
      full_name: gName,
    });
    if (error) return { data: null, error };
    guardianId = id;
  }

  const row = {
    full_name: form.full_name.trim(),
    dob: form.dob || null,
    gender: form.gender || null,
    address: form.address?.trim() || null,
    phone: form.phone?.trim() || null,
    admission_date: form.admission_date || null,
    class_id: form.class_id || null,
    section_id: form.section_id || null,
    academic_year_id: form.academic_year_id || null,
    guardian_id: guardianId,
    profile_photo_path: form.profile_photo_path?.trim() || null,
  };

  const res = await supabase
    .from("students")
    .update(row)
    .eq("id", studentId)
    .select(studentSelect)
    .single();
  if (!res.error) {
    void logAdminActivity({
      action: "student.update",
      entityType: "student",
      entityId: studentId,
      summary: form.full_name?.trim(),
    });
  }
  return res;
}

export async function deleteStudent(id) {
  const res = await supabase.from("students").delete().eq("id", id);
  if (!res.error) {
    void logAdminActivity({
      action: "student.delete",
      entityType: "student",
      entityId: id,
    });
  }
  return res;
}

/**
 * Sequential bulk create (e.g. CSV import). `assignment` is applied to each row.
 * Row keys: full_name (required), dob, gender, address, phone, admission_date,
 * guardian_name, guardian_phone, guardian_email, relation_to_student (optional).
 */
export async function createStudentsBulk(rows, assignment) {
  const errors = [];
  let ok = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const form = {
      full_name: (r.full_name ?? "").trim(),
      dob: r.dob?.trim() || null,
      gender: r.gender?.trim() || null,
      address: r.address?.trim() || null,
      phone: r.phone?.trim() || null,
      admission_date: r.admission_date?.trim() || null,
      class_id: assignment.class_id || null,
      section_id: assignment.section_id || null,
      academic_year_id: assignment.academic_year_id || null,
      profile_photo_path: null,
    };
    if (!form.full_name) {
      errors.push({ line: i + 2, message: "Missing full_name" });
      continue;
    }
    const guardianFields = {
      full_name: (r.guardian_name ?? "").trim(),
      phone: (r.guardian_phone ?? "").trim() || null,
      email: (r.guardian_email ?? "").trim() || null,
      relation_to_student: (r.relation_to_student ?? r.relation ?? "").trim() || null,
    };
    const { error } = await createStudent(form, guardianFields);
    if (error) errors.push({ line: i + 2, message: error.message });
    else ok += 1;
  }
  if (ok > 0) {
    void logAdminActivity({
      action: "student.import",
      summary: `Imported ${ok} student(s)`,
      metadata: { ok, failed: errors.length },
    });
  }
  return { ok, errors };
}

export async function listYearsOptions() {
  return supabase
    .from("academic_years")
    .select("id, name")
    .order("start_date", { ascending: false });
}

export async function listClassesOptions(academicYearId) {
  if (!academicYearId) {
    return { data: [], error: null };
  }
  return supabase
    .from("classes")
    .select("id, name")
    .eq("academic_year_id", academicYearId)
    .order("display_order", { ascending: true });
}

export async function listSectionsOptions(classId) {
  if (!classId) {
    return { data: [], error: null };
  }
  return supabase
    .from("sections")
    .select("id, name")
    .eq("class_id", classId)
    .order("display_order", { ascending: true });
}
