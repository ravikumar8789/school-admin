import { supabase } from "../supabaseClient";

export async function checkAdminAccess() {
  const { data: needsBootstrap, error: e1 } = await supabase.rpc(
    "no_admins_yet"
  );
  if (e1) {
    return { state: "error", error: e1, needsBootstrap: false, isAdmin: false };
  }

  if (needsBootstrap === true) {
    return { state: "bootstrap", error: null, needsBootstrap: true, isAdmin: false };
  }

  const { data: isAdmin, error: e2 } = await supabase.rpc("is_admin");
  if (e2) {
    return { state: "error", error: e2, needsBootstrap: false, isAdmin: false };
  }

  if (isAdmin === true) {
    return { state: "ok", error: null, needsBootstrap: false, isAdmin: true };
  }

  return { state: "denied", error: null, needsBootstrap: false, isAdmin: false };
}

export async function bootstrapFirstAdmin(userId, fullName) {
  const { error } = await supabase.from("admins").insert({
    id: userId,
    full_name: fullName || null,
  });
  return { error };
}
