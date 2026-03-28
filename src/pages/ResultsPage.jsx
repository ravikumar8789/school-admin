import { useCallback, useEffect, useState } from "react";
import { usePreferences } from "../context/PreferencesContext";
import {
  listExams,
  insertExam,
  updateExam,
  deleteExam,
  listExamSubjects,
  insertExamSubject,
  deleteExamSubject,
  listGrades,
  insertGrade,
  updateGrade,
  deleteGrade,
  fetchMarksMatrix,
  upsertMarks,
  listResultsForExam,
  recalculateResultsForExam,
  fetchExamWithMeta,
} from "../services/examService";
import { listSubjects } from "../services/academicService";
import { listClassesOptions } from "../services/studentService";
import { fetchRoster } from "../services/attendanceService";

const tabs = [
  { id: "grades", label: "Grade bands" },
  { id: "exams", label: "Exams & subjects" },
  { id: "marks", label: "Enter marks" },
  { id: "results", label: "Results" },
];

const EXAM_TYPES = [
  { value: "unit_test", label: "Unit test" },
  { value: "midterm", label: "Midterm" },
  { value: "final", label: "Final" },
  { value: "custom", label: "Custom" },
];

export function ResultsPage() {
  const [tab, setTab] = useState("grades");
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const onDone = useCallback((m, e) => {
    setMsg(m ?? null);
    setErr(e ?? null);
    if (m) {
      setTimeout(() => setMsg(null), 3500);
    }
  }, []);

  return (
    <div className="space-y-4">
      {msg ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</p>
      ) : null}
      {err ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      ) : null}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setErr(null);
            }}
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
      {tab === "grades" ? <GradesTab onDone={onDone} /> : null}
      {tab === "exams" ? <ExamsTab onDone={onDone} /> : null}
      {tab === "marks" ? <MarksTab onDone={onDone} /> : null}
      {tab === "results" ? <ResultsTab onDone={onDone} /> : null}
    </div>
  );
}

function GradesTab({ onDone }) {
  const { preferredAcademicYearId, setPreferredAcademicYearId, years } =
    usePreferences();
  const yearId = preferredAcademicYearId;
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    name: "",
    min_percent: "",
    max_percent: "",
    sort_order: "0",
    academic_year_id: "",
  });
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await listGrades(yearId || undefined);
    if (error) onDone(null, error.message);
    else setRows(data ?? []);
  }, [yearId, onDone]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (editingId) return;
    if (!preferredAcademicYearId) return;
    setForm((f) =>
      f.academic_year_id ? f : { ...f, academic_year_id: preferredAcademicYearId }
    );
  }, [editingId, preferredAcademicYearId]);

  async function save(e) {
    e.preventDefault();
    const row = {
      name: form.name.trim(),
      min_percent: Number(form.min_percent),
      max_percent: Number(form.max_percent),
      sort_order: Number(form.sort_order) || 0,
      academic_year_id: form.academic_year_id || null,
    };
    const res = editingId
      ? await updateGrade(editingId, row)
      : await insertGrade(row);
    if (res.error) {
      onDone(null, res.error.message);
      return;
    }
    setForm({
      name: "",
      min_percent: "",
      max_percent: "",
      sort_order: "0",
      academic_year_id: "",
    });
    setEditingId(null);
    await load();
    onDone("Grade saved.");
  }

  async function remove(id) {
    if (!window.confirm("Delete this grade band?")) return;
    const { error } = await deleteGrade(id);
    if (error) onDone(null, error.message);
    else {
      await load();
      onDone("Deleted.");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Define letter/grade bands by percentage. Leave year empty for school-wide defaults.
      </p>
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Filter by year</label>
          <select
            value={yearId}
            onChange={(e) => setPreferredAcademicYearId(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">All (year-specific + global)</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <form
        onSubmit={save}
        className="grid gap-2 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      >
        <input
          required
          placeholder="Name (e.g. A)"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          step="0.01"
          placeholder="Min %"
          value={form.min_percent}
          onChange={(e) => setForm((f) => ({ ...f, min_percent: e.target.value }))}
          className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          step="0.01"
          placeholder="Max %"
          value={form.max_percent}
          onChange={(e) => setForm((f) => ({ ...f, max_percent: e.target.value }))}
          className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Sort"
          value={form.sort_order}
          onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
          className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
        />
        <select
          value={form.academic_year_id}
          onChange={(e) => setForm((f) => ({ ...f, academic_year_id: e.target.value }))}
          className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
        >
          <option value="">Global / all years</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            {editingId ? "Update" : "Add"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({
                  name: "",
                  min_percent: "",
                  max_percent: "",
                  sort_order: "0",
                  academic_year_id: "",
                });
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs text-slate-600">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Range %</th>
            <th className="px-3 py-2">Year</th>
            <th className="px-3 py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2">
                {r.min_percent} – {r.max_percent}
              </td>
              <td className="px-3 py-2 text-slate-600">{r.academic_year_id ? "Set" : "Global"}</td>
              <td className="space-x-2 px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(r.id);
                    setForm({
                      name: r.name,
                      min_percent: String(r.min_percent),
                      max_percent: String(r.max_percent),
                      sort_order: String(r.sort_order ?? 0),
                      academic_year_id: r.academic_year_id ?? "",
                    });
                  }}
                  className="text-slate-700 underline"
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

function ExamsTab({ onDone }) {
  const { preferredAcademicYearId, setPreferredAcademicYearId, years } =
    usePreferences();
  const yearId = preferredAcademicYearId;
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    name: "",
    exam_type: "custom",
    start_date: "",
    end_date: "",
    academic_year_id: "",
    class_id: "",
  });
  const [editingExamId, setEditingExamId] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [examSubjects, setExamSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [subForm, setSubForm] = useState({
    subject_id: "",
    max_marks: "",
    pass_marks: "",
  });

  const loadExams = useCallback(async () => {
    const { data, error } = await listExams(yearId || undefined);
    if (error) onDone(null, error.message);
    else setExams(data ?? []);
  }, [yearId, onDone]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  useEffect(() => {
    if (editingExamId) return;
    if (!preferredAcademicYearId) return;
    setForm((f) =>
      f.academic_year_id ? f : { ...f, academic_year_id: preferredAcademicYearId }
    );
  }, [editingExamId, preferredAcademicYearId]);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!form.academic_year_id) {
        setClasses([]);
        return;
      }
      const { data } = await listClassesOptions(form.academic_year_id);
      if (!c) setClasses(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, [form.academic_year_id]);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await listSubjects();
      if (!c) setAllSubjects(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!selectedExamId) {
        setExamSubjects([]);
        return;
      }
      const { data, error } = await listExamSubjects(selectedExamId);
      if (!c) {
        if (error) onDone(null, error.message);
        else setExamSubjects(data ?? []);
      }
    })();
    return () => {
      c = true;
    };
  }, [selectedExamId, onDone]);

  async function saveExam(ev) {
    ev.preventDefault();
    const row = {
      name: form.name.trim(),
      exam_type: form.exam_type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      academic_year_id: form.academic_year_id,
      class_id: form.class_id,
    };
    const res = editingExamId
      ? await updateExam(editingExamId, row)
      : await insertExam(row);
    if (res.error) {
      onDone(null, res.error.message);
      return;
    }
    setForm({
      name: "",
      exam_type: "custom",
      start_date: "",
      end_date: "",
      academic_year_id: "",
      class_id: "",
    });
    setEditingExamId(null);
    await loadExams();
    if (!selectedExamId && res.data?.id) setSelectedExamId(res.data.id);
    onDone("Exam saved.");
  }

  async function removeExam(id) {
    if (!window.confirm("Delete this exam and all marks/results for it?")) return;
    const { error } = await deleteExam(id);
    if (error) onDone(null, error.message);
    else {
      if (selectedExamId === id) setSelectedExamId("");
      await loadExams();
      onDone("Exam deleted.");
    }
  }

  async function addSubject(ev) {
    ev.preventDefault();
    if (!selectedExamId) {
      onDone(null, "Select an exam.");
      return;
    }
    const res = await insertExamSubject({
      exam_id: selectedExamId,
      subject_id: subForm.subject_id,
      max_marks: Number(subForm.max_marks),
      pass_marks: subForm.pass_marks ? Number(subForm.pass_marks) : null,
    });
    if (res.error) onDone(null, res.error.message);
    else {
      setSubForm({ subject_id: "", max_marks: "", pass_marks: "" });
      const { data } = await listExamSubjects(selectedExamId);
      setExamSubjects(data ?? []);
      onDone("Subject added to exam.");
    }
  }

  async function removeSubject(id) {
    const { error } = await deleteExamSubject(id);
    if (error) onDone(null, error.message);
    else {
      const { data } = await listExamSubjects(selectedExamId);
      setExamSubjects(data ?? []);
      onDone("Subject removed.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Exams</h3>
        <div>
          <label className="text-xs text-slate-600">Filter list by year</label>
          <select
            value={yearId}
            onChange={(e) => setPreferredAcademicYearId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
        <form onSubmit={saveExam} className="space-y-2">
          <input
            required
            placeholder="Exam name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
          <select
            value={form.exam_type}
            onChange={(e) => setForm((f) => ({ ...f, exam_type: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            {EXAM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>
          <select
            required
            value={form.academic_year_id}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                academic_year_id: e.target.value,
                class_id: "",
              }))
            }
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">Academic year</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
          <select
            required
            value={form.class_id}
            onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
            disabled={!form.academic_year_id}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              {editingExamId ? "Update exam" : "Create exam"}
            </button>
            {editingExamId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingExamId(null);
                  setForm({
                    name: "",
                    exam_type: "custom",
                    start_date: "",
                    end_date: "",
                    academic_year_id: "",
                    class_id: "",
                  });
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
        <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
          {exams.map((ex) => (
            <li
              key={ex.id}
              className={`flex items-center justify-between rounded px-2 py-1 ${
                selectedExamId === ex.id ? "bg-slate-900 text-white" : "bg-slate-50"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedExamId(ex.id)}
                className="truncate text-left"
              >
                {ex.name} — {ex.classes?.name}
              </button>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingExamId(ex.id);
                    setForm({
                      name: ex.name,
                      exam_type: ex.exam_type,
                      start_date: ex.start_date ?? "",
                      end_date: ex.end_date ?? "",
                      academic_year_id: ex.academic_year_id,
                      class_id: ex.class_id,
                    });
                  }}
                  className={
                    selectedExamId === ex.id
                      ? "text-slate-200 underline"
                      : "text-slate-600 underline"
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeExam(ex.id)}
                  className="text-red-500 underline"
                >
                  Del
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Subjects in selected exam</h3>
        {!selectedExamId ? (
          <p className="text-sm text-slate-500">Select an exam on the left.</p>
        ) : (
          <>
            <form onSubmit={addSubject} className="flex flex-wrap items-end gap-2">
              <select
                required
                value={subForm.subject_id}
                onChange={(e) =>
                  setSubForm((s) => ({ ...s, subject_id: e.target.value }))
                }
                className="min-w-[8rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-2 py-1 text-sm"
              >
                <option value="">Subject</option>
                {allSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                required
                type="number"
                step="0.01"
                placeholder="Max marks"
                value={subForm.max_marks}
                onChange={(e) =>
                  setSubForm((s) => ({ ...s, max_marks: e.target.value }))
                }
                className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-2 py-1 text-sm"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Pass"
                value={subForm.pass_marks}
                onChange={(e) =>
                  setSubForm((s) => ({ ...s, pass_marks: e.target.value }))
                }
                className="w-20 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-2 py-1 text-sm"
              />
              <button
                type="submit"
                className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                Add
              </button>
            </form>
            <ul className="space-y-1 text-sm">
              {examSubjects.map((es) => (
                <li
                  key={es.id}
                  className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 py-1"
                >
                  <span>
                    {es.subjects?.name} — max {es.max_marks}
                    {es.pass_marks != null ? ` / pass ${es.pass_marks}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSubject(es.id)}
                    className="text-red-600 underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function MarksTab({ onDone }) {
  const { preferredAcademicYearId, setPreferredAcademicYearId, years } =
    usePreferences();
  const yearId = preferredAcademicYearId;
  const [examId, setExamId] = useState("");
  const [exams, setExams] = useState([]);
  const [roster, setRoster] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await listExams(yearId || undefined);
      if (!c) setExams(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, [yearId]);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!examId) {
        setRoster([]);
        setSubjects([]);
        setMatrix({});
        return;
      }
      setLoading(true);
      const { data: ex, error: exErr } = await fetchExamWithMeta(examId);
      if (c) return;
      if (exErr || !ex) {
        setLoading(false);
        onDone(null, exErr?.message ?? "Exam not found.");
        return;
      }
      const { data: stud, error: rErr } = await fetchRoster(
        ex.academic_year_id,
        ex.class_id,
        undefined
      );
      if (rErr) {
        setLoading(false);
        onDone(null, rErr.message);
        return;
      }
      const { subjects: subs, marksByStudent, error: mErr } =
        await fetchMarksMatrix(examId);
      if (c) return;
      if (mErr) {
        setLoading(false);
        onDone(null, mErr.message);
        return;
      }
      setRoster(stud ?? []);
      setSubjects(subs ?? []);
      const m = {};
      (stud ?? []).forEach((s) => {
        m[s.id] = {};
        (subs ?? []).forEach((sub) => {
          const v = marksByStudent?.[s.id]?.[sub.id];
          m[s.id][sub.id] = v != null ? String(v) : "";
        });
      });
      setMatrix(m);
      setLoading(false);
    })();
    return () => {
      c = true;
    };
  }, [examId, onDone]);

  function setCell(studentId, examSubjectId, val) {
    setMatrix((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [examSubjectId]: val },
    }));
  }

  async function saveMarks() {
    if (!examId || !subjects.length) {
      onDone(null, "Select an exam with subjects.");
      return;
    }
    const rows = [];
    roster.forEach((s) => {
      subjects.forEach((sub) => {
        const raw = matrix[s.id]?.[sub.id]?.trim();
        if (raw === "") return;
        const num = Number(raw);
        if (Number.isNaN(num)) return;
        rows.push({
          exam_subject_id: sub.id,
          student_id: s.id,
          marks_obtained: num,
        });
      });
    });
    setSaving(true);
    const { error } = await upsertMarks(rows);
    setSaving(false);
    if (error) onDone(null, error.message);
    else onDone(`Saved ${rows.length} mark entries.`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-slate-600">Filter exams by year</label>
          <select
            value={yearId}
            onChange={(e) => setPreferredAcademicYearId(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-600">Exam *</label>
          <select
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="mt-1 block min-w-[14rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} — {ex.classes?.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            disabled={saving}
            onClick={saveMarks}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save marks"}
          </button>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : examId && roster.length === 0 ? (
        <p className="text-sm text-slate-500">No students in this exam&apos;s class/year.</p>
      ) : examId && !subjects.length ? (
        <p className="text-sm text-amber-700">Add subjects to this exam first.</p>
      ) : examId ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2">Student</th>
                {subjects.map((sub) => (
                  <th key={sub.id} className="px-2 py-2 whitespace-nowrap">
                    {sub.subjects?.name ?? "?"}
                    <span className="text-slate-400"> (max {sub.max_marks})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium text-slate-900">
                    {s.full_name}
                  </td>
                  {subjects.map((sub) => (
                    <td key={sub.id} className="px-1 py-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={matrix[s.id]?.[sub.id] ?? ""}
                        onChange={(e) => setCell(s.id, sub.id, e.target.value)}
                        className="w-20 rounded border border-slate-300 px-1 py-0.5"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Select an exam.</p>
      )}
    </div>
  );
}

function ResultsTab({ onDone }) {
  const { preferredAcademicYearId, setPreferredAcademicYearId, years } =
    usePreferences();
  const yearId = preferredAcademicYearId;
  const [examId, setExamId] = useState("");
  const [exams, setExams] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calcBusy, setCalcBusy] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await listExams(yearId || undefined);
      if (!c) setExams(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, [yearId]);

  const loadResults = useCallback(async () => {
    if (!examId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await listResultsForExam(examId);
    setLoading(false);
    if (error) onDone(null, error.message);
    else setRows(data ?? []);
  }, [examId, onDone]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  async function recalc() {
    if (!examId) return;
    setCalcBusy(true);
    const { error } = await recalculateResultsForExam(examId);
    setCalcBusy(false);
    if (error) onDone(null, error.message);
    else {
      await loadResults();
      onDone("Results recalculated for all students in the class (missing marks = 0).");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-slate-600">Year filter</label>
          <select
            value={yearId}
            onChange={(e) => setPreferredAcademicYearId(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-600">Exam</label>
          <select
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="mt-1 block min-w-[14rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!examId || calcBusy}
          onClick={recalc}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {calcBusy ? "Working…" : "Recalculate results"}
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2">Rank</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">%</th>
                <th className="px-3 py-2">Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">{r.rank_in_class ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.students?.full_name}{" "}
                    <span className="font-mono text-xs text-slate-500">
                      {r.students?.student_code}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.total_marks ?? "—"}</td>
                  <td className="px-3 py-2">{r.percentage ?? "—"}</td>
                  <td className="px-3 py-2">{r.grades?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
