import { useCallback, useEffect, useState } from "react";
import {
  listFeeStructures,
  insertFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  listStudentFees,
  assignFeeToAllInClass,
  recordPayment,
  listRecentReceipts,
} from "../services/feesService";
import { usePreferences } from "../context/PreferencesContext";
import { listYearsOptions, listClassesOptions } from "../services/studentService";
import { downloadReceiptPdf } from "../utils/receiptPdf";

const tabs = [
  { id: "structures", label: "Fee structures" },
  { id: "balances", label: "Student fees & payments" },
  { id: "receipts", label: "Recent receipts" },
];

function emptyStructureForm() {
  return {
    name: "",
    total_amount: "",
    due_date: "",
    late_fee_amount: "0",
    academic_year_id: "",
    class_id: "",
  };
}

export function FeesPage() {
  const [tab, setTab] = useState("structures");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setError(null);
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

      {tab === "structures" ? (
        <FeeStructuresPanel
          onNotify={(msg, err) => {
            setMessage(msg);
            setError(err ?? null);
            if (msg) setTimeout(() => setMessage(null), 4000);
          }}
        />
      ) : null}
      {tab === "balances" ? (
        <BalancesPanel
          onNotify={(msg, err) => {
            setMessage(msg);
            setError(err ?? null);
            if (msg) setTimeout(() => setMessage(null), 4000);
          }}
        />
      ) : null}
      {tab === "receipts" ? <ReceiptsPanel /> : null}
    </div>
  );
}

function FeeStructuresPanel({ onNotify }) {
  const { preferredAcademicYearId } = usePreferences();
  const [rows, setRows] = useState([]);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyStructureForm());
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editingId) return;
    if (!preferredAcademicYearId) return;
    setForm((f) =>
      f.academic_year_id ? f : { ...f, academic_year_id: preferredAcademicYearId }
    );
  }, [editingId, preferredAcademicYearId]);

  const load = useCallback(async () => {
    const { data, error: e } = await listFeeStructures();
    if (e) onNotify(null, e.message);
    else setRows(data ?? []);
  }, [onNotify]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await listYearsOptions();
      if (!c) setYears(data ?? []);
    })();
    return () => {
      c = true;
    };
  }, []);

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

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      total_amount: Number(form.total_amount),
      due_date: form.due_date || null,
      late_fee_amount: Number(form.late_fee_amount) || 0,
      academic_year_id: form.academic_year_id,
      class_id: form.class_id,
    };
    const res = editingId
      ? await updateFeeStructure(editingId, payload)
      : await insertFeeStructure(payload);
    setBusy(false);
    if (res.error) {
      onNotify(null, res.error.message);
      return;
    }
    setForm(emptyStructureForm());
    setEditingId(null);
    await load();
    onNotify(editingId ? "Structure updated." : "Structure created.");
  }

  async function remove(id) {
    if (!window.confirm("Delete this fee structure? Linked student fees may be affected.")) {
      return;
    }
    const { error: e } = await deleteFeeStructure(id);
    if (e) {
      onNotify(null, e.message);
      return;
    }
    await load();
    onNotify("Structure deleted.");
  }

  function startEdit(r) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      total_amount: String(r.total_amount),
      due_date: r.due_date ?? "",
      late_fee_amount: String(r.late_fee_amount ?? 0),
      academic_year_id: r.academic_year_id,
      class_id: r.class_id,
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={save}
        className="grid gap-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="sm:col-span-2 lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {editingId ? "Edit fee structure" : "New fee structure"}
          </h3>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Total amount *</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.total_amount}
            onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Due date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Late fee amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.late_fee_amount}
            onChange={(e) => setForm((f) => ({ ...f, late_fee_amount: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Academic year *</label>
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
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
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
            required
            value={form.class_id}
            onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
            disabled={!form.academic_year_id}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">Select</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {editingId ? "Update" : "Create"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyStructureForm());
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-4 py-2 text-sm"
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
              <th className="px-4 py-2">Year / Class</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-2 text-slate-600">
                  {r.academic_years?.name} / {r.classes?.name}
                </td>
                <td className="px-4 py-2">{Number(r.total_amount).toFixed(2)}</td>
                <td className="px-4 py-2 text-slate-600">{r.due_date ?? "—"}</td>
                <td className="space-x-2 px-4 py-2 text-right text-sm">
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
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
    </div>
  );
}

function BalancesPanel({ onNotify }) {
  const {
    preferredAcademicYearId,
    setPreferredAcademicYearId,
    schoolDisplayName,
  } = usePreferences();
  const yearId = preferredAcademicYearId;
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [structures, setStructures] = useState([]);
  const [years, setYears] = useState([]);
  const [assignStructureId, setAssignStructureId] = useState("");
  const [payFor, setPayFor] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payRef, setPayRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const loadBalances = useCallback(async () => {
    setLoading(true);
    const res = await listStudentFees({
      academicYearId: yearId || undefined,
      status: status || undefined,
    });
    setLoading(false);
    if (res.error) {
      onNotify(null, res.error.message);
      setRows([]);
      return;
    }
    setRows(res.data ?? []);
  }, [yearId, status, onNotify]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  useEffect(() => {
    let c = false;
    (async () => {
      const [{ data: y }, { data: s }] = await Promise.all([
        listYearsOptions(),
        listFeeStructures(),
      ]);
      if (c) return;
      setYears(y ?? []);
      setStructures(s ?? []);
    })();
    return () => {
      c = true;
    };
  }, []);

  async function assignClass() {
    if (!assignStructureId) {
      onNotify(null, "Select a fee structure.");
      return;
    }
    setLoading(true);
    const { error: e } = await assignFeeToAllInClass(assignStructureId);
    setLoading(false);
    if (e) {
      onNotify(null, e.message);
      return;
    }
    await loadBalances();
    onNotify("Assigned fee records to students in that class (who did not already have this fee).");
  }

  async function submitPayment(ev) {
    ev.preventDefault();
    if (!payFor) return;
    setPaying(true);
    const { data, error: payError } = await recordPayment(payFor.id, {
      amount: payAmount,
      method: payMethod,
      reference: payRef,
    });
    setPaying(false);
    if (payError) {
      onNotify(null, payError.message);
      return;
    }
    if (data?.receiptError) {
      onNotify(
        `Payment recorded but receipt failed: ${data.receiptError.message}`,
        null
      );
    } else {
      onNotify(`Payment saved. Receipt ${data?.receipt?.receipt_number ?? ""}.`);
      if (data?.receipt && payFor) {
        downloadReceiptPdf({
          schoolName: schoolDisplayName?.trim() || undefined,
          receiptNumber: data.receipt.receipt_number,
          issuedAt: data.receipt.issued_at,
          studentName: payFor.students?.full_name,
          studentCode: payFor.students?.student_code,
          feeName: payFor.fee_structures?.name,
          amount: payAmount,
          method: payMethod,
          reference: payRef,
        });
      }
    }
    setPayAmount("");
    setPayMethod("");
    setPayRef("");
    setPayFor(null);
    await loadBalances();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Assign fee to whole class</h3>
        <p className="mt-1 text-xs text-slate-500">
          Creates a pending student fee for each student in the structure&apos;s class and
          year who does not already have this fee.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <select
            value={assignStructureId}
            onChange={(e) => setAssignStructureId(e.target.value)}
            className="min-w-[14rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">Select fee structure</option>
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.academic_years?.name} / {s.classes?.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={loading}
            onClick={assignClass}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Assign to class
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
        <div>
          <label className="text-xs font-medium text-slate-600">Academic year</label>
          <select
            value={yearId}
            onChange={(e) => setPreferredAcademicYearId(e.target.value)}
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
          <label className="text-xs font-medium text-slate-600">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block min-w-[8rem] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
          </select>
        </div>
        <button
          type="button"
          onClick={loadBalances}
          className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
        >
          Refresh
        </button>
      </div>

      {payFor ? (
        <form
          onSubmit={submitPayment}
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm"
        >
          <h4 className="text-sm font-semibold text-slate-900">
            Record payment — {payFor.students?.full_name} ({payFor.fee_structures?.name})
          </h4>
          <p className="text-xs text-slate-600">
            Balance:{" "}
            {(
              Number(payFor.amount_due) - Number(payFor.amount_paid)
            ).toFixed(2)}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Amount *</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Method</label>
              <input
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                placeholder="Cash / UPI / …"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Reference</label>
              <input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={paying}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {paying ? "Saving…" : "Record payment & receipt"}
            </button>
            <button
              type="button"
              onClick={() => setPayFor(null)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Fee</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Balance</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const bal = Number(r.amount_due) - Number(r.amount_paid);
                return (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-900">
                        {r.students?.full_name}
                      </span>
                      <span className="ml-2 font-mono text-xs text-slate-500">
                        {r.students?.student_code}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.fee_structures?.name}</td>
                    <td className="px-3 py-2">{Number(r.amount_due).toFixed(2)}</td>
                    <td className="px-3 py-2">{Number(r.amount_paid).toFixed(2)}</td>
                    <td className="px-3 py-2">{bal.toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-600">{r.status}</td>
                    <td className="px-3 py-2 text-right">
                      {r.status !== "paid" && r.status !== "waived" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPayFor(r);
                            setPayAmount(
                              Math.max(bal, 0.01).toFixed(2)
                            );
                          }}
                          className="text-slate-900 underline"
                        >
                          Pay
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No student fees for this filter. Create structures and assign to a class.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReceiptsPanel() {
  const { schoolDisplayName } = usePreferences();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data, error } = await listRecentReceipts(40);
      if (!c) {
        if (error) setRows([]);
        else setRows(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading receipts…</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2">Receipt #</th>
            <th className="px-3 py-2">Issued</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Student</th>
            <th className="px-3 py-2">Fee</th>
            <th className="px-3 py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = r.payments;
            const sf = p?.student_fees;
            return (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 font-mono text-xs">{r.receipt_number}</td>
                <td className="px-3 py-2 text-slate-600">
                  {r.issued_at
                    ? new Date(r.issued_at).toLocaleString()
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  {p?.amount != null ? Number(p.amount).toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2">
                  {sf?.students?.full_name ?? "—"}{" "}
                  <span className="text-xs text-slate-500">
                    {sf?.students?.student_code}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                  {sf?.fee_structures?.name ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadReceiptPdf({
                        schoolName: schoolDisplayName?.trim() || undefined,
                        receiptNumber: r.receipt_number,
                        issuedAt: r.issued_at,
                        studentName: sf?.students?.full_name,
                        studentCode: sf?.students?.student_code,
                        feeName: sf?.fee_structures?.name,
                        amount: p?.amount,
                        method: p?.method,
                        reference: p?.reference,
                      })
                    }
                    className="text-xs font-medium text-slate-700 underline dark:text-slate-300"
                  >
                    PDF
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">No receipts yet.</p>
      ) : null}
    </div>
  );
}
