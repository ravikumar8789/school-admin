import { useCallback, useEffect, useState } from "react";
import {
  fetchAcademicOverview,
  listAcademicYears,
  insertAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  listClassesForYear,
  insertClass,
  updateClass,
  deleteClass,
  listSectionsForClass,
  insertSection,
  updateSection,
  deleteSection,
  listSubjects,
  insertSubject,
  updateSubject,
  deleteSubject,
  listClassSubjects,
  insertClassSubject,
  deleteClassSubject,
} from "../services/academicService";

const tabs = [
  { id: "years", label: "Academic years" },
  { id: "classes", label: "Classes & sections" },
  { id: "subjects", label: "Subjects" },
  { id: "classSubjects", label: "Subjects per class" },
];

function emptyYearForm() {
  return {
    name: "",
    start_date: "",
    end_date: "",
    is_active: false,
    status: "draft",
  };
}

export function AcademicStructurePage() {
  const [tab, setTab] = useState("years");
  const [overview, setOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    const { years, error: err } = await fetchAcademicOverview();
    if (err) {
      setError(err);
      setOverview([]);
    } else {
      setOverview(years ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (cancelled) return;
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  function flash(msg) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-600">Loading academic structure…</p>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Manage academic years, classes, sections, subjects, and class–subject links.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            refresh();
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>
      {message ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>
      ) : null}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === t.id
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "years" ? (
        <AcademicYearsPanel onSaved={() => { refresh(); flash("Saved."); }} />
      ) : null}
      {tab === "classes" ? (
        <ClassesSectionsPanel
          years={overview}
          onSaved={() => {
            refresh();
            flash("Saved.");
          }}
        />
      ) : null}
      {tab === "subjects" ? (
        <SubjectsPanel onSaved={() => flash("Saved.")} />
      ) : null}
      {tab === "classSubjects" ? (
        <ClassSubjectsPanel years={overview} onSaved={() => flash("Saved.")} />
      ) : null}
    </div>
  );
}

function AcademicYearsPanel({ onSaved }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyYearForm());
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  async function load() {
    const { data, error: e } = await listAcademicYears();
    if (e) setLocalError(e);
    else {
      setLocalError(null);
      setRows(data ?? []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active,
      status: row.status,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyYearForm());
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setLocalError(null);
    const payload = {
      name: form.name.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      is_active: form.is_active,
      status: form.status,
    };
    const res = editingId
      ? await updateAcademicYear(editingId, payload)
      : await insertAcademicYear(payload);
    setBusy(false);
    if (res.error) {
      setLocalError(res.error);
      return;
    }
    cancelEdit();
    await load();
    onSaved();
  }

  async function remove(id) {
    if (
      !window.confirm(
        "Delete this academic year? Classes and related data under it may be removed (cascade)."
      )
    ) {
      return;
    }
    setBusy(true);
    const { error: e } = await deleteAcademicYear(id);
    setBusy(false);
    if (e) {
      setLocalError(e);
      return;
    }
    await load();
    onSaved();
  }

  return (
    <div className="space-y-4">
      {localError ? (
        <p className="text-sm text-red-600">{localError.message}</p>
      ) : null}
      <form
        onSubmit={save}
        className="grid gap-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="sm:col-span-2 lg:col-span-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {editingId ? "Edit academic year" : "Add academic year"}
          </h2>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Start date</label>
          <input
            required
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">End date</label>
          <input
            required
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            id="is_active"
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="rounded border-slate-300"
          />
          <label htmlFor="is_active" className="text-sm text-slate-700">
            Mark as active year
          </label>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {editingId ? "Update" : "Add year"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 text-xs font-medium text-slate-600">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Range</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-2 text-slate-600">
                  {r.start_date} → {r.end_date}
                </td>
                <td className="px-4 py-2">{r.is_active ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="space-x-2 px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    className="text-slate-700 underline hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="text-red-600 underline hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClassesSectionsPanel({ years, onSaved }) {
  const [yearId, setYearId] = useState(years[0]?.id ?? "");
  const [classes, setClasses] = useState([]);
  const [sectionsByClass, setSectionsByClass] = useState({});
  const [classForm, setClassForm] = useState({ name: "", display_order: 0 });
  const [editingClassId, setEditingClassId] = useState(null);
  const [sectionForms, setSectionForms] = useState({});
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!yearId && years.length) {
      setYearId(years[0].id);
    }
  }, [years, yearId]);

  const loadClasses = useCallback(async () => {
    if (!yearId) {
      setClasses([]);
      return;
    }
    const { data, error: e } = await listClassesForYear(yearId);
    if (e) setLocalError(e);
    else {
      setLocalError(null);
      setClasses(data ?? []);
    }
  }, [yearId]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  async function loadSections(classId) {
    const { data, error: e } = await listSectionsForClass(classId);
    if (!e) {
      setSectionsByClass((prev) => ({ ...prev, [classId]: data ?? [] }));
    }
  }

  useEffect(() => {
    classes.forEach((c) => {
      if (!sectionsByClass[c.id]) loadSections(c.id);
    });
  }, [classes]);

  async function saveClass(e) {
    e.preventDefault();
    if (!yearId) return;
    setBusy(true);
    setLocalError(null);
    const payload = {
      academic_year_id: yearId,
      name: classForm.name.trim(),
      display_order: Number(classForm.display_order) || 0,
    };
    const res = editingClassId
      ? await updateClass(editingClassId, {
          name: payload.name,
          display_order: payload.display_order,
        })
      : await insertClass(payload);
    setBusy(false);
    if (res.error) {
      setLocalError(res.error);
      return;
    }
    setClassForm({ name: "", display_order: 0 });
    setEditingClassId(null);
    await loadClasses();
    onSaved();
  }

  function startEditClass(c) {
    setEditingClassId(c.id);
    setClassForm({ name: c.name, display_order: c.display_order ?? 0 });
  }

  async function removeClass(id) {
    if (!window.confirm("Delete this class and its sections?")) return;
    setBusy(true);
    const { error: e } = await deleteClass(id);
    setBusy(false);
    if (e) {
      setLocalError(e);
      return;
    }
    await loadClasses();
    onSaved();
  }

  async function addSection(classId, form) {
    const name = form.name?.trim();
    if (!name) return;
    setBusy(true);
    const { error: e } = await insertSection({
      class_id: classId,
      name,
      display_order: Number(form.display_order) || 0,
    });
    setBusy(false);
    if (e) {
      setLocalError(e);
      return;
    }
    setSectionForms((prev) => ({ ...prev, [classId]: { name: "", display_order: 0 } }));
    await loadSections(classId);
    onSaved();
  }

  async function removeSection(sectionId, classId) {
    if (!window.confirm("Delete this section?")) return;
    setBusy(true);
    const { error: e } = await deleteSection(sectionId);
    setBusy(false);
    if (e) {
      setLocalError(e);
      return;
    }
    await loadSections(classId);
    onSaved();
  }

  return (
    <div className="space-y-4">
      {localError ? (
        <p className="text-sm text-red-600">{localError.message}</p>
      ) : null}
      <div>
        <label className="text-xs font-medium text-slate-600">Academic year</label>
        <select
          value={yearId}
          onChange={(e) => {
            setYearId(e.target.value);
            setEditingClassId(null);
            setClassForm({ name: "", display_order: 0 });
          }}
          className="mt-1 max-w-md rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
        >
          <option value="">Select year</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </div>
      {yearId ? (
        <>
          <form
            onSubmit={saveClass}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm"
          >
            <div>
              <label className="text-xs font-medium text-slate-600">Class name</label>
              <input
                required
                value={classForm.name}
                onChange={(e) =>
                  setClassForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Order</label>
              <input
                type="number"
                value={classForm.display_order}
                onChange={(e) =>
                  setClassForm((f) => ({ ...f, display_order: e.target.value }))
                }
                className="mt-1 w-24 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {editingClassId ? "Update class" : "Add class"}
            </button>
            {editingClassId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingClassId(null);
                  setClassForm({ name: "", display_order: 0 });
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-4 py-2 text-sm text-slate-800"
              >
                Cancel
              </button>
            ) : null}
          </form>
          <div className="space-y-4">
            {classes.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <div className="space-x-2 text-sm">
                    <button
                      type="button"
                      onClick={() => startEditClass(c)}
                      className="text-slate-700 underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeClass(c.id)}
                      className="text-red-600 underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-600">Sections</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {(sectionsByClass[c.id] ?? []).map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded bg-slate-50 px-2 py-1"
                      >
                        <span>
                          {s.name}{" "}
                          <span className="text-slate-400">({s.display_order})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSection(s.id, c.id)}
                          className="text-xs text-red-600 underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <input
                      placeholder="Section name"
                      value={sectionForms[c.id]?.name ?? ""}
                      onChange={(e) =>
                        setSectionForms((prev) => ({
                          ...prev,
                          [c.id]: {
                            name: e.target.value,
                            display_order: prev[c.id]?.display_order ?? 0,
                          },
                        }))
                      }
                      className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Order"
                      value={sectionForms[c.id]?.display_order ?? 0}
                      onChange={(e) =>
                        setSectionForms((prev) => ({
                          ...prev,
                          [c.id]: {
                            name: prev[c.id]?.name ?? "",
                            display_order: e.target.value,
                          },
                        }))
                      }
                      className="w-20 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        addSection(c.id, sectionForms[c.id] ?? { name: "", display_order: 0 })
                      }
                      className="rounded bg-slate-800 px-2 py-1 text-xs text-white"
                    >
                      Add section
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">Select an academic year first.</p>
      )}
    </div>
  );
}

function SubjectsPanel({ onSaved }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: "", code: "" });
  const [editingId, setEditingId] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error: e } = await listSubjects();
    if (e) setLocalError(e);
    else {
      setLocalError(null);
      setRows(data ?? []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const payload = { name: form.name.trim(), code: form.code?.trim() || null };
    const res = editingId
      ? await updateSubject(editingId, payload)
      : await insertSubject(payload);
    setBusy(false);
    if (res.error) {
      setLocalError(res.error);
      return;
    }
    setForm({ name: "", code: "" });
    setEditingId(null);
    await load();
    onSaved();
  }

  async function remove(id) {
    if (!window.confirm("Delete this subject? Class and exam links may break.")) return;
    const { error: e } = await deleteSubject(id);
    if (e) {
      setLocalError(e);
      return;
    }
    await load();
    onSaved();
  }

  return (
    <div className="space-y-4">
      {localError ? (
        <p className="text-sm text-red-600">{localError.message}</p>
      ) : null}
      <form
        onSubmit={save}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm"
      >
        <div>
          <label className="text-xs font-medium text-slate-600">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Code</label>
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="mt-1 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          {editingId ? "Update" : "Add subject"}
        </button>
        {editingId != null ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ name: "", code: "" });
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-4 py-2 text-sm"
          >
            Cancel
          </button>
        ) : null}
      </form>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 text-xs text-slate-600">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Code</th>
            <th className="px-4 py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
              <td className="px-4 py-2">{r.name}</td>
              <td className="px-4 py-2 text-slate-600">{r.code ?? "—"}</td>
              <td className="space-x-2 px-4 py-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(r.id);
                    setForm({ name: r.name, code: r.code ?? "" });
                  }}
                  className="underline text-slate-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="text-red-600 underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClassSubjectsPanel({ years, onSaved }) {
  const [yearId, setYearId] = useState(years[0]?.id ?? "");
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [pickSubjectId, setPickSubjectId] = useState("");
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!yearId && years.length) {
      setYearId(years[0].id);
    }
  }, [years, yearId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: subs } = await listSubjects();
      if (!cancelled) setAllSubjects(subs ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadClasses = useCallback(async () => {
    if (!yearId) {
      setClasses([]);
      return;
    }
    const { data, error: e } = await listClassesForYear(yearId);
    if (e) setLocalError(e);
    else {
      setLocalError(null);
      setClasses(data ?? []);
    }
  }, [yearId]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (classes.length && !classId) {
      setClassId(classes[0].id);
    } else if (classId && !classes.find((c) => c.id === classId)) {
      setClassId(classes[0]?.id ?? "");
    }
  }, [classes, classId]);

  const loadAssigned = useCallback(async () => {
    if (!yearId || !classId) {
      setAssigned([]);
      return;
    }
    const { data, error: e } = await listClassSubjects(yearId, classId);
    if (e) setLocalError(e);
    else {
      setLocalError(null);
      setAssigned(data ?? []);
    }
  }, [yearId, classId]);

  useEffect(() => {
    loadAssigned();
  }, [loadAssigned]);

  const assignedIds = new Set(assigned.map((a) => a.subject_id));

  async function linkSubject() {
    if (!pickSubjectId || !yearId || !classId) return;
    const { error: e } = await insertClassSubject({
      academic_year_id: yearId,
      class_id: classId,
      subject_id: pickSubjectId,
    });
    if (e) {
      setLocalError(e);
      return;
    }
    setPickSubjectId("");
    await loadAssigned();
    onSaved();
  }

  async function unlink(rowId) {
    const { error: e } = await deleteClassSubject(rowId);
    if (e) {
      setLocalError(e);
      return;
    }
    await loadAssigned();
    onSaved();
  }

  const availableSubjects = allSubjects.filter((s) => !assignedIds.has(s.id));

  return (
    <div className="space-y-4">
      {localError ? (
        <p className="text-sm text-red-600">{localError.message}</p>
      ) : null}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="text-xs font-medium text-slate-600">Academic year</label>
          <select
            value={yearId}
            onChange={(e) => {
              setYearId(e.target.value);
              setClassId("");
            }}
            className="mt-1 block max-w-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">Select</option>
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
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 block max-w-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {yearId && classId ? (
        <>
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
            <div>
              <label className="text-xs font-medium text-slate-600">Add subject</label>
              <select
                value={pickSubjectId}
                onChange={(e) => setPickSubjectId(e.target.value)}
                className="mt-1 block max-w-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              >
                <option value="">Choose subject</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={linkSubject}
              disabled={!pickSubjectId}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Assign
            </button>
          </div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-sm">
            {assigned.length === 0 ? (
              <li className="px-4 py-6 text-center text-slate-500">
                No subjects assigned yet.
              </li>
            ) : (
              assigned.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between px-4 py-2"
                >
                  <span>
                    {row.subjects?.name ?? "Subject"}{" "}
                    {row.subjects?.code ? (
                      <span className="text-slate-400">({row.subjects.code})</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => unlink(row.id)}
                    className="text-red-600 underline"
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      ) : (
        <p className="text-sm text-slate-500">Select year and class.</p>
      )}
    </div>
  );
}
