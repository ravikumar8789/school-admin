import { useEffect, useState } from "react";
import { usePreferences } from "../context/PreferencesContext";
import { downloadCsv } from "../utils/csvDownload";
import {
  getStudentReportRows,
  getAttendanceReportRows,
  getFeesReportRows,
  getExamResultsReportRows,
} from "../services/reportsService";
import { listClassesOptions, listSectionsOptions } from "../services/studentService";
import { listExams } from "../services/examService";

const tabs = [
  { id: "students", label: "Students" },
  { id: "attendance", label: "Attendance" },
  { id: "fees", label: "Fees" },
  { id: "exams", label: "Exam results" },
];

export function ReportsPage() {
  const [tab, setTab] = useState("students");

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Download CSV reports. PDF/Excel can be added later; exports use UTF‑8 with BOM for
        Excel.
      </p>
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
      {tab === "students" ? <ReportStudents /> : null}
      {tab === "attendance" ? <ReportAttendance /> : null}
      {tab === "fees" ? <ReportFees /> : null}
      {tab === "exams" ? <ReportExams /> : null}
    </div>
  );
}

function ReportStudents() {
  const { preferredAcademicYearId, setPreferredAcademicYearId, years } =
    usePreferences();
  const yearId = preferredAcademicYearId;
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!yearId) {
      setClasses([]);
      return;
    }
    listClassesOptions(yearId).then(({ data }) => setClasses(data ?? []));
  }, [yearId]);
  useEffect(() => {
    if (!classId) {
      setSections([]);
      return;
    }
    listSectionsOptions(classId).then(({ data }) => setSections(data ?? []));
  }, [classId]);

  async function download() {
    setBusy(true);
    setError(null);
    const { rows, error: e } = await getStudentReportRows({
      academicYearId: yearId || undefined,
      classId: classId || undefined,
      sectionId: sectionId || undefined,
    });
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    downloadCsv(`students_${new Date().toISOString().slice(0, 10)}.csv`, rows, [
      { key: "code", label: "Student code" },
      { key: "name", label: "Name" },
      { key: "gender", label: "Gender" },
      { key: "dob", label: "DOB" },
      { key: "phone", label: "Phone" },
      { key: "year_name", label: "Academic year" },
      { key: "class_name", label: "Class" },
      { key: "section_name", label: "Section" },
      { key: "admission", label: "Admission date" },
    ]);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm space-y-3">
      <FilterRow
        yearId={yearId}
        setYearId={setPreferredAcademicYearId}
        classId={classId}
        setClassId={setClassId}
        sectionId={sectionId}
        setSectionId={setSectionId}
        years={years}
        classes={classes}
        sections={sections}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={download}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Building…" : "Download CSV"}
      </button>
    </div>
  );
}

function ReportAttendance() {
  const { preferredAcademicYearId, setPreferredAcademicYearId, years } =
    usePreferences();
  const yearId = preferredAcademicYearId;
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    setError(null);
    const { rows, error: e } = await getAttendanceReportRows({
      fromDate: from,
      toDate: to,
      academicYearId: yearId || undefined,
    });
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    downloadCsv(`attendance_${from}_to_${to}.csv`, rows, [
      { key: "date", label: "Date" },
      { key: "code", label: "Student code" },
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
      { key: "notes", label: "Notes" },
    ]);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-slate-600">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Academic year</label>
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
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={download}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Building…" : "Download CSV"}
      </button>
    </div>
  );
}

function ReportFees() {
  const { preferredAcademicYearId, setPreferredAcademicYearId, years } =
    usePreferences();
  const yearId = preferredAcademicYearId;
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    setError(null);
    const { rows, error: e } = await getFeesReportRows({
      academicYearId: yearId || undefined,
    });
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    downloadCsv(`student_fees_${new Date().toISOString().slice(0, 10)}.csv`, rows, [
      { key: "student_code", label: "Code" },
      { key: "student_name", label: "Student" },
      { key: "fee_name", label: "Fee" },
      { key: "amount_due", label: "Due" },
      { key: "amount_paid", label: "Paid" },
      { key: "balance", label: "Balance" },
      { key: "status", label: "Status" },
    ]);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm space-y-3">
      <div>
        <label className="text-xs text-slate-600">Filter by fee structure year</label>
        <select
          value={yearId}
          onChange={(e) => setPreferredAcademicYearId(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={download}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Building…" : "Download CSV"}
      </button>
    </div>
  );
}

function ReportExams() {
  const { preferredAcademicYearId, setPreferredAcademicYearId, years } =
    usePreferences();
  const yearId = preferredAcademicYearId;
  const [examId, setExamId] = useState("");
  const [exams, setExams] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listExams(yearId || undefined).then(({ data }) => setExams(data ?? []));
  }, [yearId]);

  async function download() {
    if (!examId) {
      setError("Select an exam.");
      return;
    }
    setBusy(true);
    setError(null);
    const { rows, error: e } = await getExamResultsReportRows(examId);
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    const ex = exams.find((x) => x.id === examId);
    const slug = (ex?.name ?? "exam").replace(/[^\w-]+/g, "_").slice(0, 40);
    downloadCsv(`exam_results_${slug}.csv`, rows, [
      { key: "rank", label: "Rank" },
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "total_marks", label: "Total marks" },
      { key: "percentage", label: "%" },
      { key: "grade", label: "Grade" },
    ]);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-slate-600">Year</label>
          <select
            value={yearId}
            onChange={(e) => {
              setPreferredAcademicYearId(e.target.value);
              setExamId("");
            }}
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
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={download}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Building…" : "Download CSV"}
      </button>
    </div>
  );
}

function FilterRow({
  yearId,
  setYearId,
  classId,
  setClassId,
  sectionId,
  setSectionId,
  years,
  classes,
  sections,
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <div>
        <label className="text-xs text-slate-600">Academic year</label>
        <select
          value={yearId}
          onChange={(e) => {
            setYearId(e.target.value);
            setClassId("");
            setSectionId("");
          }}
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
        <label className="text-xs text-slate-600">Class</label>
        <select
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setSectionId("");
          }}
          disabled={!yearId}
          className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
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
        <label className="text-xs text-slate-600">Section</label>
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          disabled={!classId}
          className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
        >
          <option value="">All</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
