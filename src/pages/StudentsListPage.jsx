import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePreferences } from "../context/PreferencesContext";
import {
  listStudents,
  listClassesOptions,
  listSectionsOptions,
  createStudentsBulk,
} from "../services/studentService";
import { parseStudentImportCsv } from "../utils/parseStudentImportCsv";

export function StudentsListPage() {
  const {
    preferredAcademicYearId,
    setPreferredAcademicYearId,
    years,
    refreshYears,
  } = usePreferences();

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const yearId = preferredAcademicYearId;
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [search, setSearch] = useState("");

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [importOpen, setImportOpen] = useState(false);
  const [importYearId, setImportYearId] = useState("");
  const [importClassId, setImportClassId] = useState("");
  const [importSectionId, setImportSectionId] = useState("");
  const [importClasses, setImportClasses] = useState([]);
  const [importSections, setImportSections] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [importErr, setImportErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!yearId) {
        setClasses([]);
        return;
      }
      const { data } = await listClassesOptions(yearId);
      if (!cancelled) setClasses(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [yearId]);

  useEffect(() => {
    if (!importOpen) return;
    setImportYearId((y) => y || preferredAcademicYearId || "");
  }, [importOpen, preferredAcademicYearId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!importYearId) {
        setImportClasses([]);
        return;
      }
      const { data } = await listClassesOptions(importYearId);
      if (!cancelled) setImportClasses(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [importYearId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!importClassId) {
        setImportSections([]);
        return;
      }
      const { data } = await listSectionsOptions(importClassId);
      if (!cancelled) setImportSections(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [importClassId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!classId) {
        setSections([]);
        return;
      }
      const { data } = await listSectionsOptions(classId);
      if (!cancelled) setSections(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err, count: c } = await listStudents({
      academicYearId: yearId || undefined,
      classId: classId || undefined,
      sectionId: sectionId || undefined,
      search: search.trim() || undefined,
    });
    if (err) {
      setError(err);
      setRows([]);
      setCount(0);
    } else {
      setRows(data ?? []);
      setCount(c ?? 0);
    }
    setLoading(false);
  }, [yearId, classId, sectionId, search]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  function clearFilters() {
    setPreferredAcademicYearId("");
    setClassId("");
    setSectionId("");
    setSearch("");
  }

  async function runImport() {
    setImportErr(null);
    setImportMsg(null);
    if (!importYearId || !importClassId) {
      setImportErr("Select academic year and class for imported students.");
      return;
    }
    if (!importFile) {
      setImportErr("Choose a CSV file.");
      return;
    }
    setImportBusy(true);
    try {
      const text = await importFile.text();
      const { rows, error: parseErr } = parseStudentImportCsv(text);
      if (parseErr) {
        setImportErr(parseErr);
        setImportBusy(false);
        return;
      }
      const { ok, errors } = await createStudentsBulk(rows, {
        academic_year_id: importYearId,
        class_id: importClassId,
        section_id: importSectionId || null,
      });
      setImportMsg(
        `Imported ${ok} student${ok === 1 ? "" : "s"}.${errors.length ? ` ${errors.length} row(s) failed.` : ""}`
      );
      if (errors.length) {
        setImportErr(
          errors.slice(0, 8).map((e) => `Line ${e.line}: ${e.message}`).join("\n") +
            (errors.length > 8 ? `\n… and ${errors.length - 8} more` : "")
        );
      }
      setImportFile(null);
      await refreshYears();
      await loadStudents();
    } catch (e) {
      setImportErr(e?.message ?? "Import failed.");
    }
    setImportBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {count} student{count === 1 ? "" : "s"} found
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setImportOpen((o) => !o);
              setImportErr(null);
              setImportMsg(null);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            {importOpen ? "Close import" : "Import CSV"}
          </button>
          <Link
            to="/students/add"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add student
          </Link>
        </div>
      </div>

      {importOpen ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Bulk import (CSV)</h2>
          <p className="text-xs text-slate-600">
            First row:{" "}
            <span className="font-mono text-[11px]">
              full_name,dob,gender,address,phone,admission_date,guardian_name,guardian_phone,guardian_email,relation_to_student
            </span>
            . Only <span className="font-medium">full_name</span> is required. Fields with commas
            or line breaks may be wrapped in double quotes (RFC 4180). All rows are assigned to
            the class (and optional section) you select below.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Academic year *</label>
              <select
                value={importYearId}
                onChange={(e) => {
                  setImportYearId(e.target.value);
                  setImportClassId("");
                  setImportSectionId("");
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
                value={importClassId}
                onChange={(e) => {
                  setImportClassId(e.target.value);
                  setImportSectionId("");
                }}
                disabled={!importYearId}
                className="mt-1 block min-w-[10rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
              >
                <option value="">Select</option>
                {importClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Section</label>
              <select
                value={importSectionId}
                onChange={(e) => setImportSectionId(e.target.value)}
                disabled={!importClassId}
                className="mt-1 block min-w-[8rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
              >
                <option value="">None</option>
                {importSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="mt-1 block text-sm"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <button
              type="button"
              disabled={importBusy}
              onClick={runImport}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {importBusy ? "Importing…" : "Run import"}
            </button>
          </div>
          {importMsg ? (
            <p className="text-sm text-green-800 whitespace-pre-wrap">{importMsg}</p>
          ) : null}
          {importErr ? (
            <p className="text-sm text-red-700 whitespace-pre-wrap">{importErr}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <div>
          <label className="text-xs font-medium text-slate-600">Academic year</label>
          <select
            value={yearId}
            onChange={(e) => {
              setPreferredAcademicYearId(e.target.value);
              setClassId("");
              setSectionId("");
            }}
            className="mt-1 block min-w-[10rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
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
          <label className="text-xs font-medium text-slate-600">Class</label>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId("");
            }}
            disabled={!yearId}
            className="mt-1 block min-w-[10rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">All</option>
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
            <option value="">All</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Search</label>
          <input
            placeholder="Name or student code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 w-48 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
        >
          Clear filters
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error.message}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Class</th>
                <th className="px-4 py-2">Section</th>
                <th className="px-4 py-2">Year</th>
                <th className="px-4 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">
                    {s.student_code}
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-900">{s.full_name}</td>
                  <td className="px-4 py-2 text-slate-600">{s.classes?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{s.sections?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {s.academic_years?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <Link
                      to={`/students/${s.id}`}
                      className="text-slate-700 underline hover:text-slate-900"
                    >
                      View
                    </Link>
                    <Link
                      to={`/students/${s.id}/edit`}
                      className="text-slate-700 underline hover:text-slate-900"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No students match the filters.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
