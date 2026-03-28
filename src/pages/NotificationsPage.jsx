import { useCallback, useEffect, useState } from "react";
import {
  listNotifications,
  insertNotification,
  updateNotification,
  deleteNotification,
} from "../services/notificationService";
import { useAuth } from "../context/AuthContext";

const TYPES = [
  { value: "general", label: "General" },
  { value: "exam_alert", label: "Exam alert" },
  { value: "fee_reminder", label: "Fee reminder" },
  { value: "holiday", label: "Holiday" },
];

function emptyForm() {
  return {
    title: "",
    body: "",
    notification_type: "general",
    scheduled_at: "",
  };
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: e } = await listNotifications(200);
    if (e) {
      setError(e.message);
      setRows([]);
    } else {
      setError(null);
      setRows(data ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(ev) {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    const row = {
      title: form.title.trim(),
      body: form.body.trim() || null,
      notification_type: form.notification_type,
      scheduled_at: form.scheduled_at
        ? new Date(form.scheduled_at).toISOString()
        : null,
    };
    const res = editingId
      ? await updateNotification(editingId, row)
      : await insertNotification({
          ...row,
          created_by: user?.id ?? null,
        });
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setForm(emptyForm());
    setEditingId(null);
    await load();
  }

  async function remove(id) {
    if (!window.confirm("Delete this notification?")) return;
    const { error: e } = await deleteNotification(id);
    if (e) setError(e.message);
    else await load();
  }

  function startEdit(r) {
    setEditingId(r.id);
    setForm({
      title: r.title,
      body: r.body ?? "",
      notification_type: r.notification_type,
      scheduled_at: r.scheduled_at
        ? r.scheduled_at.slice(0, 16)
        : "",
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={save}
        className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm space-y-3 max-w-2xl"
      >
        <h3 className="text-sm font-semibold text-slate-900">
          {editingId ? "Edit notification" : "New notification"}
        </h3>
        <div>
          <label className="text-xs font-medium text-slate-600">Title *</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Body</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Type</label>
            <select
              value={form.notification_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, notification_type: e.target.value }))
              }
              className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Schedule (optional)</label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, scheduled_at: e.target.value }))
              }
              className="mt-1 block rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {editingId ? "Update" : "Publish"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm());
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
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Scheduled</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 font-medium text-slate-900">{r.title}</td>
                <td className="px-3 py-2 text-slate-600">{r.notification_type}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {r.scheduled_at
                    ? new Date(r.scheduled_at).toLocaleString()
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString()
                    : "—"}
                </td>
                <td className="space-x-2 px-3 py-2 text-right text-sm">
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    className="text-slate-800 underline"
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
