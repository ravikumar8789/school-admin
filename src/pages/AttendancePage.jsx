import { useCallback, useEffect, useState } from "react";
import { usePreferences } from "../context/PreferencesContext";
import {
  fetchRoster,
  fetchAttendanceForDate,
  upsertAttendanceRows,
  fetchAttendanceReport,
} from "../services/attendanceService";
import { listClassesOptions, listSectionsOptions } from "../services/studentService";
import { downloadCsv } from "../utils/csvDownload";

const STATUS_OPTS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half day" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage() {
  const { preferredAcademicYearId, setPreferredAcademicYearId, years } =
    usePreferences();
  const yearId = preferredAcademicYearId;

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(todayIso);

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [roster, setRoster] = useState([]);
  const [localRows, setLocalRows] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [exportFrom, setExportFrom] = useState(todayIso);
  const [exportTo, setExportTo] = useState(todayIso);
  const [exportYearId, setExportYearId] = useState(preferredAcademicYearId);

  useEffect(() => {
    setExportYearId(preferredAcademicYearId || "");
  }, [preferredAcademicYearId]);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!yearId) {
        setClasses([]);
        return;
      }
      const { data } = await listClassesOptions(yearId);
      if (!c) setClasses(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, [yearId]);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!classId) {
        setSections([]);
        return;
      }
      const { data } = await listSectionsOptions(classId);
      if (!c) setSections(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, [classId]);

  const loadMarkingData = useCallback(async () => {
    if (!yearId || !classId || !date) {
      setRoster([]);
      setLocalRows({});
      return;
    }
    setLoading(true);
    setError(null);
    const { data: students, error: e1 } = await fetchRoster(
      yearId,
      classId,
      sectionId || undefined
    );
    if (e1) {
      setError(e1);
      setRoster([]);
      setLocalRows({});
      setLoading(false);
      return;
    }
    const list = students ?? [];
    setRoster(list);

    const { map, error: e2 } = await fetchAttendanceForDate(date, yearId);
    if (e2) {
      setError(e2);
      setLoading(false);
      return;
    }

    const next = {};
    list.forEach((s) => {
      const ex = map[s.id];
      next[s.id] = {
        status: ex?.status ?? "present",
        notes: ex?.notes ?? "",
        attendanceId: ex?.id,
      };
    });
    setLocalRows(next);
    setLoading(false);
  }, [yearId, classId, sectionId, date]);

  useEffect(() => {
    loadMarkingData();
  }, [loadMarkingData]);

  const canMark = yearId && classId && date;

  function setRow(studentId, patch) {
    setLocalRows((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...patch },
    }));
  }

  function markAll(status) {
    setLocalRows((prev) => {
      const next = { ...prev };
      roster.forEach((s) => {
        next[s.id] = { ...next[s.id], status };
      });
      return next;
    });
  }

  async function saveMarks() {
    if (!canMark) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const rows = roster.map((s) => {
      const r = localRows[s.id];
      return {
        student_id: s.id,
        academic_year_id: yearId,
        attendance_date: date,
        status: r?.status ?? "present",
        notes: r?.notes?.trim() || null,
      };
    });
    const { error: e } = await upsertAttendanceRows(rows);
    setSaving(false);
    if (e) {
      setError(e);
      return;
    }
    setMessage("Attendance saved.");
    await loadMarkingData();
  }

  async function exportReport() {
    setError(null);
    const { data, error: e } = await fetchAttendanceReport({
      fromDate: exportFrom,
      toDate: exportTo,
      academicYearId: exportYearId || undefined,
    });
    if (e) {
      setError(e);
      return;
    }
    const headers = [
      { key: "date", label: "Date" },
      { key: "code", label: "Student code" },
      { key: "name", label: "Student name" },
      { key: "status", label: "Status" },
      { key: "notes", label: "Notes" },
    ];
    const reportRows = (data ?? []).map((row) => ({
      date: row.attendance_date,
      code: row.students?.student_code ?? "",
      name: row.students?.full_name ?? "",
      status: row.status,
      notes: row.notes ?? "",
    }));
    downloadCsv(
      `attendance_${exportFrom}_to_${exportTo}.csv`,
      reportRows,
      headers
    );
  }

  const rosterCount = roster.length;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Mark attendance</h2>
        <p className="mt-1 text-xs text-slate-500">
          Choose academic year, class, optional section, and date. Save writes one row per
          student for that day (upsert).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Academic year *</label>
            <select
              value={yearId}
              onChange={(e) => {
                setPreferredAcademicYearId(e.target.value);
                setClassId("");
                setSectionId("");
              }}
              className="mt-1 block min-w-[10rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
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
            <label className="text-xs font-medium text-slate-600">Class *</label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
              }}
              disabled={!yearId}
              className="mt-1 block min-w-[10rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="">Select</option>
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
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!classId}
              className="mt-1 block min-w-[8rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600">{error.message}</p>
        ) : null}
        {message ? (
          <p className="mt-3 text-sm text-green-700">{message}</p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading roster…</p>
        ) : canMark ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">
                {rosterCount} student{rosterCount === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => markAll("present")}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200"
              >
                Mark all present
              </button>
              <button
                type="button"
                onClick={() => markAll("absent")}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200"
              >
                Mark all absent
              </button>
              <button
                type="button"
                disabled={saving || !rosterCount}
                onClick={saveMarks}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save attendance"}
              </button>
            </div>
            {rosterCount === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No students match this class/section/year.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 text-xs font-medium text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => {
                      const r = localRows[s.id] ?? { status: "present", notes: "" };
                      return (
                        <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">
                            {s.student_code}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {s.full_name}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={r.status}
                              onChange={(e) =>
                                setRow(s.id, { status: e.target.value })
                              }
                              className="rounded border border-slate-300 px-2 py-1 text-sm"
                            >
                              {STATUS_OPTS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={r.notes}
                              onChange={(e) =>
                                setRow(s.id, { notes: e.target.value })
                              }
                              className="w-full min-w-[8rem] rounded border border-slate-300 px-2 py-1 text-sm"
                              placeholder="Optional"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Select year, class, and date to load the roster.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Export attendance (CSV)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Download all attendance rows in the date range (optional year filter).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">From</label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">To</label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Academic year</label>
            <select
              value={exportYearId}
              onChange={(e) => setExportYearId(e.target.value)}
              className="mt-1 block min-w-[10rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={exportReport}
            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Download CSV
          </button>
        </div>
      </section>
    </div>
  );
}
