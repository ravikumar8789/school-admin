import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getStudentById, deleteStudent } from "../services/studentService";

export function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: err } = await getStudentById(id);
      if (cancelled) return;
      if (err) {
        setError(err);
        setStudent(null);
      } else {
        setError(null);
        setStudent(data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete this student? Related attendance and fee records may be removed (cascade)."
      )
    ) {
      return;
    }
    setRemoving(true);
    const { error: err } = await deleteStudent(id);
    setRemoving(false);
    if (err) {
      setError(err);
      return;
    }
    navigate("/students", { replace: true });
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading student…</p>;
  }

  if (error || !student) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error?.message ?? "Student not found."}
      </div>
    );
  }

  const g = student.guardians;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {student.student_code}
          </p>
          <h2 className="text-xl font-semibold text-slate-900">{student.full_name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/students/${id}/edit`}
            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Edit
          </Link>
          <button
            type="button"
            disabled={removing}
            onClick={handleDelete}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
          >
            {removing ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Student</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">DOB</dt>
              <dd className="text-slate-900">{student.dob ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Gender</dt>
              <dd className="text-slate-900">{student.gender ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Phone</dt>
              <dd className="text-slate-900">{student.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Admission</dt>
              <dd className="text-slate-900">{student.admission_date ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Class / section</dt>
              <dd className="text-slate-900">
                {student.classes?.name ?? "—"} / {student.sections?.name ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Academic year</dt>
              <dd className="text-slate-900">{student.academic_years?.name ?? "—"}</dd>
            </div>
          </dl>
          {student.address ? (
            <p className="mt-3 text-sm text-slate-700">
              <span className="text-slate-500">Address: </span>
              {student.address}
            </p>
          ) : null}
          {student.profile_photo_path ? (
            <p className="mt-2 text-xs text-slate-500">
              Photo path: {student.profile_photo_path}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Guardian</h3>
          {g ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Name</dt>
                <dd className="text-slate-900">{g.full_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Phone</dt>
                <dd className="text-slate-900">{g.phone ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Email</dt>
                <dd className="text-slate-900">{g.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Relation</dt>
                <dd className="text-slate-900">{g.relation_to_student ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No guardian linked.</p>
          )}
        </section>
      </div>

      <Link to="/students" className="text-sm text-slate-600 underline hover:text-slate-900">
        ← Back to students
      </Link>
    </div>
  );
}
