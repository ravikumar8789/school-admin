import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import {
  listPromotableStudents,
  promoteStudents,
  listPromotionHistory,
  rollbackPromotion,
} from "../services/promotionService";
import {
  listYearsOptions,
  listClassesOptions,
  listSectionsOptions,
} from "../services/studentService";

export function PromotionPage() {
  const { user } = useAuth();
  const { preferredAcademicYearId, setPreferredAcademicYearId } = usePreferences();

  const [fromYearId, setFromYearId] = useState(preferredAcademicYearId || "");
  const [fromClassId, setFromClassId] = useState("");
  const [fromSectionId, setFromSectionId] = useState("");
  const [toYearId, setToYearId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [toSectionId, setToSectionId] = useState("");

  const [years, setYears] = useState([]);
  const [fromClasses, setFromClasses] = useState([]);
  const [fromSections, setFromSections] = useState([]);
  const [toClasses, setToClasses] = useState([]);
  const [toSections, setToSections] = useState([]);

  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [history, setHistory] = useState([]);
  const [yearNameById, setYearNameById] = useState({});
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await listYearsOptions();
      if (!c && data) {
        setYears(data);
        setYearNameById(Object.fromEntries(data.map((y) => [y.id, y.name])));
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!fromYearId) {
        setFromClasses([]);
        return;
      }
      const { data } = await listClassesOptions(fromYearId);
      if (!c) setFromClasses(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, [fromYearId]);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!toYearId) {
        setToClasses([]);
        return;
      }
      const { data } = await listClassesOptions(toYearId);
      if (!c) setToClasses(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, [toYearId]);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!fromClassId) {
        setFromSections([]);
        return;
      }
      const { data } = await listSectionsOptions(fromClassId);
      if (!c) setFromSections(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, [fromClassId]);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!toClassId) {
        setToSections([]);
        return;
      }
      const { data } = await listSectionsOptions(toClassId);
      if (!c) setToSections(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, [toClassId]);

  const loadRoster = useCallback(async () => {
    if (!fromYearId || !fromClassId) {
      setStudents([]);
      setSelected(new Set());
      return;
    }
    setLoading(true);
    const { data, error: e } = await listPromotableStudents(
      fromYearId,
      fromClassId,
      fromSectionId || undefined
    );
    setLoading(false);
    if (e) {
      setError(e.message);
      setStudents([]);
    } else {
      setError(null);
      setStudents(data ?? []);
      setSelected(new Set());
    }
  }, [fromYearId, fromClassId, fromSectionId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const loadHistory = useCallback(async () => {
    const { data, error: e } = await listPromotionHistory(80);
    if (e) setError(e.message);
    else setHistory(data ?? []);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const allSelected = useMemo(() => {
    if (!students.length) return false;
    return students.every((s) => selected.has(s.id));
  }, [students, selected]);

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map((s) => s.id)));
    }
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runPromote() {
    if (!toYearId || !toClassId) {
      setError("Select target academic year and class.");
      return;
    }
    const ids = [...selected];
    if (!ids.length) {
      setError("Select at least one student.");
      return;
    }
    setPromoting(true);
    setError(null);
    setMessage(null);
    const { errors } = await promoteStudents({
      studentIds: ids,
      toAcademicYearId: toYearId,
      toClassId: toClassId,
      toSectionId: toSectionId || null,
      performedBy: user?.id,
    });
    setPromoting(false);
    if (errors.length) {
      setError(errors.slice(0, 5).join("; "));
    } else {
      setMessage(`Promoted ${ids.length} student(s).`);
    }
    await loadRoster();
    await loadHistory();
    setSelected(new Set());
  }

  async function runRollback(promotionId) {
    if (!window.confirm("Rollback this promotion? Student record reverts to previous class/year.")) {
      return;
    }
    setError(null);
    const { error: e } = await rollbackPromotion(promotionId);
    if (e) setError(e.message);
    else {
      setMessage("Rolled back.");
      await loadRoster();
      await loadHistory();
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        Move students from a current class/year into a target class/year. A row is logged in{" "}
        <strong>student_promotions</strong> for audit; you can roll back recent promotions.
      </p>

      {message ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">From (current)</h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={fromYearId}
            onChange={(e) => {
              const v = e.target.value;
              setFromYearId(v);
              setPreferredAcademicYearId(v);
              setFromClassId("");
              setFromSectionId("");
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">Academic year *</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
          <select
            value={fromClassId}
            onChange={(e) => {
              setFromClassId(e.target.value);
              setFromSectionId("");
            }}
            disabled={!fromYearId}
            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">Class *</option>
            {fromClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={fromSectionId}
            onChange={(e) => setFromSectionId(e.target.value)}
            disabled={!fromClassId}
            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">All sections</option>
            {fromSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <h2 className="text-sm font-semibold text-slate-900 border-t border-slate-100 pt-4">
          To (target)
        </h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={toYearId}
            onChange={(e) => {
              setToYearId(e.target.value);
              setToClassId("");
              setToSectionId("");
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">Academic year *</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
          <select
            value={toClassId}
            onChange={(e) => {
              setToClassId(e.target.value);
              setToSectionId("");
            }}
            disabled={!toYearId}
            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">Class *</option>
            {toClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={toSectionId}
            onChange={(e) => setToSectionId(e.target.value)}
            disabled={!toClassId}
            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">Section (optional)</option>
            {toSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={promoting || !selected.size}
            onClick={runPromote}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {promoting ? "Promoting…" : `Promote selected (${selected.size})`}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Loading roster…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Section</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleOne(s.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{s.student_code}</td>
                    <td className="px-3 py-2">{s.full_name}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {s.sections?.name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!students.length && fromYearId && fromClassId ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                No students in this group.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Recent promotions</h2>
          <button
            type="button"
            onClick={loadHistory}
            className="text-sm text-slate-600 underline"
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">From year → To year</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {h.promoted_at
                      ? new Date(h.promoted_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {h.students?.full_name}{" "}
                    <span className="font-mono text-xs text-slate-500">
                      {h.students?.student_code}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {yearNameById[h.from_academic_year_id] ?? "—"} →{" "}
                    {yearNameById[h.to_academic_year_id] ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {h.rolled_back ? (
                      <span className="text-slate-500">Rolled back</span>
                    ) : (
                      <span className="text-green-700">Active</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!h.rolled_back ? (
                      <button
                        type="button"
                        onClick={() => runRollback(h.id)}
                        className="text-sm text-red-600 underline"
                      >
                        Rollback
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
