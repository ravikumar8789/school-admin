import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  checkAdminAccess,
  bootstrapFirstAdmin,
} from "../services/adminService";

export function AdminGate({ children }) {
  const { user, signOut } = useAuth();
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const runCheck = useCallback(async () => {
    if (!user) return;
    setPhase("loading");
    setError(null);
    const result = await checkAdminAccess();
    if (result.state === "error") {
      setError(result.error);
      setPhase("error");
      return;
    }
    if (result.state === "bootstrap") {
      setPhase("bootstrap");
      return;
    }
    if (result.state === "denied") {
      setPhase("denied");
      return;
    }
    setPhase("ok");
  }, [user]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  async function handleBootstrap() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await bootstrapFirstAdmin(
      user.id,
      user.user_metadata?.full_name ?? user.email ?? ""
    );
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    await runCheck();
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        Checking access…
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
        <p className="text-lg font-medium text-slate-900 dark:text-slate-100">Database setup required</p>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {error?.message ||
            "Could not verify admin access. Run `tables_queries.sql` in the Supabase SQL Editor, then refresh."}
        </p>
        <button
          type="button"
          onClick={() => runCheck()}
          className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-3 text-sm text-slate-600 hover:text-slate-900"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (phase === "bootstrap") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Create first administrator
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            No admin account is registered yet. Link your signed-in user as the first
            admin for this school.
          </p>
          {error ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error.message}
            </p>
          ) : null}
          <button
            type="button"
            disabled={submitting}
            onClick={handleBootstrap}
            className="mt-6 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Continue as administrator"}
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-3 w-full text-sm text-slate-600 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
        <p className="text-lg font-medium text-slate-900 dark:text-slate-100">Access denied</p>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          Your account is not registered in the admins table. Ask an administrator
          to add your user ID in Supabase, or sign in with an admin account.
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-6 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>
    );
  }

  return children;
}
