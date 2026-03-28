import { supabase } from "../supabaseClient";

export const DOCUMENTS_BUCKET = "student_documents";

export const DOC_TYPES = [
  { value: "birth_certificate", label: "Birth certificate" },
  { value: "transfer_certificate", label: "Transfer certificate" },
  { value: "marksheet", label: "Marksheet" },
  { value: "id_proof", label: "ID proof" },
  { value: "profile_photo", label: "Profile photo" },
  { value: "other", label: "Other" },
];

function safeFileSuffix(originalName) {
  const base = (originalName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(0, 120);
}

export async function listDocuments({ studentId } = {}) {
  let q = supabase
    .from("student_documents")
    .select(
      `
      id,
      student_id,
      doc_type,
      storage_path,
      file_name,
      created_at,
      students ( student_code, full_name )
    `
    )
    .order("created_at", { ascending: false });

  if (studentId) q = q.eq("student_id", studentId);

  return q;
}

export async function uploadDocument({ studentId, docType, file }) {
  if (!file?.size) {
    return { data: null, error: { message: "Choose a file." } };
  }

  const suffix = safeFileSuffix(file.name);
  const path = `${studentId}/${crypto.randomUUID()}-${suffix}`;

  const { error: upErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (upErr) return { data: null, error: upErr };

  return supabase
    .from("student_documents")
    .insert({
      student_id: studentId,
      doc_type: docType,
      storage_path: path,
      file_name: file.name,
    })
    .select()
    .single();
}

export async function getSignedUrl(storagePath, expiresIn = 3600) {
  return supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
}

export async function deleteDocument(doc) {
  const { error: sErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([doc.storage_path]);

  if (sErr) {
    console.warn("Storage delete:", sErr.message);
  }

  return supabase.from("student_documents").delete().eq("id", doc.id);
}
