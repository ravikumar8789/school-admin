import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePreferences } from "../context/PreferencesContext";
import {
  getStudentById,
  createStudent,
  updateStudent,
  listYearsOptions,
  listClassesOptions,
  listSectionsOptions,
} from "../services/studentService";

const emptyForm = () => ({
  full_name: "",
  dob: "",
  gender: "",
  address: "",
  phone: "",
  admission_date: "",
  academic_year_id: "",
  class_id: "",
  section_id: "",
  profile_photo_path: "",
});

const emptyGuardian = () => ({
  full_name: "",
  phone: "",
  email: "",
  relation_to_student: "",
});

export function StudentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { preferredAcademicYearId } = usePreferences();

  const [form, setForm] = useState(emptyForm);
  const [guardian, setGuardian] = useState(emptyGuardian);
  const [existingGuardianId, setExistingGuardianId] = useState(null);

  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await listYearsOptions();
      if (!cancelled) setYears(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isEdit) return;
    if (!preferredAcademicYearId) return;
    setForm((f) =>
      f.academic_year_id ? f : { ...f, academic_year_id: preferredAcademicYearId }
    );
  }, [isEdit, preferredAcademicYearId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!form.academic_year_id) {
        setClasses([]);
        return;
      }
      const { data } = await listClassesOptions(form.academic_year_id);
      if (!cancelled) setClasses(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [form.academic_year_id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!form.class_id) {
        setSections([]);
        return;
      }
      const { data } = await listSectionsOptions(form.class_id);
      if (!cancelled) setSections(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [form.class_id]);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: err } = await getStudentById(id);
      if (cancelled) return;
      if (err || !data) {
        setError(err ?? new Error("Not found"));
        setLoading(false);
        return;
      }
      setForm({
        full_name: data.full_name ?? "",
        dob: data.dob ?? "",
        gender: data.gender ?? "",
        address: data.address ?? "",
        phone: data.phone ?? "",
        admission_date: data.admission_date ?? "",
        academic_year_id: data.academic_year_id ?? "",
        class_id: data.class_id ?? "",
        section_id: data.section_id ?? "",
        profile_photo_path: data.profile_photo_path ?? "",
      });
      if (data.guardians) {
        setExistingGuardianId(data.guardians.id);
        setGuardian({
          full_name: data.guardians.full_name ?? "",
          phone: data.guardians.phone ?? "",
          email: data.guardians.email ?? "",
          relation_to_student: data.guardians.relation_to_student ?? "",
        });
      } else {
        setExistingGuardianId(null);
        setGuardian(emptyGuardian());
      }
      setError(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  useEffect(() => {
    if (!isEdit || loading) return;
    if (form.class_id && !sections.find((s) => s.id === form.section_id)) {
      setForm((f) => ({ ...f, section_id: "" }));
    }
  }, [sections, form.class_id, form.section_id, isEdit, loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formPayload = {
      ...form,
      dob: form.dob || null,
      admission_date: form.admission_date || null,
      academic_year_id: form.academic_year_id || null,
      class_id: form.class_id || null,
      section_id: form.section_id || null,
      gender: form.gender || null,
    };

    const res = isEdit
      ? await updateStudent(id, formPayload, guardian, existingGuardianId)
      : await createStudent(formPayload, guardian);

    setSaving(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    navigate(`/students/${res.data.id}`, { replace: !isEdit });
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">
          {isEdit ? "Edit student" : "Add student"}
        </h2>
        <Link
          to={isEdit ? `/students/${id}` : "/students"}
          className="text-sm text-slate-600 underline hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error.message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Student details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Full name *</label>
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Date of birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Admission date</label>
              <input
                type="date"
                value={form.admission_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, admission_date: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Academic year</label>
              <select
                value={form.academic_year_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    academic_year_id: e.target.value,
                    class_id: "",
                    section_id: "",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Class</label>
              <select
                value={form.class_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    class_id: e.target.value,
                    section_id: "",
                  }))
                }
                disabled={!form.academic_year_id}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
              >
                <option value="">—</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Section</label>
              <select
                value={form.section_id}
                onChange={(e) => setForm((f) => ({ ...f, section_id: e.target.value }))}
                disabled={!form.class_id}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
              >
                <option value="">—</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">
                Profile photo (storage path — upload UI in Phase 3+)
              </label>
              <input
                value={form.profile_photo_path}
                onChange={(e) =>
                  setForm((f) => ({ ...f, profile_photo_path: e.target.value }))
                }
                placeholder="e.g. profiles/student-id.jpg"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Guardian</h3>
          <p className="mt-1 text-xs text-slate-500">
            Optional: link a guardian record. Leave name empty to skip.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Full name</label>
              <input
                value={guardian.full_name}
                onChange={(e) =>
                  setGuardian((g) => ({ ...g, full_name: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Phone</label>
              <input
                value={guardian.phone}
                onChange={(e) =>
                  setGuardian((g) => ({ ...g, phone: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={guardian.email}
                onChange={(e) =>
                  setGuardian((g) => ({ ...g, email: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Relation to student</label>
              <input
                value={guardian.relation_to_student}
                onChange={(e) =>
                  setGuardian((g) => ({ ...g, relation_to_student: e.target.value }))
                }
                placeholder="e.g. Father"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create student"}
          </button>
        </div>
      </form>
    </div>
  );
}
