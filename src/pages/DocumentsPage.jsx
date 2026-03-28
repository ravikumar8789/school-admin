import { useCallback, useEffect, useState } from "react";
import { usePreferences } from "../context/PreferencesContext";
import {
  listDocuments,
  uploadDocument,
  getSignedUrl,
  deleteDocument,
  DOC_TYPES,
} from "../services/documentsService";
import { listClassesOptions, listSectionsOptions, listStudents } from "../services/studentService";

export function DocumentsPage() {
  const { preferredAcademicYearId, setPreferredAcademicYearId, years } =
    usePreferences();
  const yearId = preferredAcademicYearId;
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [uploadStudentId, setUploadStudentId] = useState("");
  const [filterStudentId, setFilterStudentId] = useState("");
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [docType, setDocType] = useState("other");
  const [file, setFile] = useState(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await listDocuments({
      studentId: filterStudentId || undefined,
    });
    setLoading(false);
    if (e) {
      setError(e.message);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
  }, [filterStudentId]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

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

  useEffect(() => {
    let c = false;
    (async () => {
      if (!yearId || !classId) {
        setStudents([]);
        return;
      }
      const { data, error: e } = await listStudents({
        academicYearId: yearId,
        classId,
        sectionId: sectionId || undefined,
      });
      if (!c) {
        if (e) setStudents([]);
        else setStudents(data ?? []);
      }
    })();
    return () => {
      c = true;
    };
  }, [yearId, classId, sectionId]);

  async function handleUpload(ev) {
    ev.preventDefault();
    if (!uploadStudentId || !file) {
      setError("Select a student and file.");
      return;
    }
    setUploading(true);
    setError(null);
    const res = await uploadDocument({
      studentId: uploadStudentId,
      docType,
      file,
    });
    setUploading(false);
    setFile(null);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    await loadDocs();
  }

  async function handleDownload(doc) {
    const { data, error: e } = await getSignedUrl(doc.storage_path, 120);
    if (e || !data?.signedUrl) {
      setError(e?.message ?? "Could not create download link.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(doc) {
    if (!window.confirm("Delete this file from storage and the database?")) return;
    const { error: e } = await deleteDocument(doc);
    if (e) setError(e.message);
    else await loadDocs();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Uploads go to the <code className="rounded bg-slate-100 px-1">student_documents</code>{" "}
        storage bucket. Run <code className="rounded bg-slate-100 px-1">tables_queries_phase5_storage.sql</code>{" "}
        in Supabase if uploads fail with permission errors.
      </p>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Upload document</h3>
        <form onSubmit={handleUpload} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Academic year</label>
            <select
              value={yearId}
              onChange={(e) => {
                setPreferredAcademicYearId(e.target.value);
                setClassId("");
                setSectionId("");
                setUploadStudentId("");
                setFilterStudentId("");
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
            <label className="text-xs font-medium text-slate-600">Class</label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
                setUploadStudentId("");
                setFilterStudentId("");
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
              onChange={(e) => {
                setSectionId(e.target.value);
                setUploadStudentId("");
                setFilterStudentId("");
              }}
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
            <label className="text-xs font-medium text-slate-600">Student *</label>
            <select
              required
              value={uploadStudentId}
              onChange={(e) => setUploadStudentId(e.target.value)}
              disabled={!classId}
              className="mt-1 block min-w-[12rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="">Select</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.student_code} — {s.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="mt-1 block min-w-[10rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">All documents</h3>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-slate-600">Filter list by student</label>
            <select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-2 py-1 text-sm"
            >
              <option value="">Everyone</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.student_code} — {s.full_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadDocs}
              className="rounded border border-slate-300 px-2 py-1"
            >
              Refresh
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          To filter the table by another class, set year/class above — the student dropdown updates.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading…</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Uploaded</th>
                  <th className="px-3 py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">
                      {r.students?.full_name}{" "}
                      <span className="font-mono text-xs text-slate-500">
                        {r.students?.student_code}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.doc_type}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-slate-600">
                      {r.file_name ?? r.storage_path}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="space-x-2 px-3 py-2 text-right text-sm">
                      <button
                        type="button"
                        onClick={() => handleDownload(r)}
                        className="text-slate-800 underline"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
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
        )}
      </section>
    </div>
  );
}
