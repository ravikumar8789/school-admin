import { supabase } from "../supabaseClient";
import { logAdminActivity } from "./activityLogService";

const feeStructureSelect = `
  id,
  name,
  total_amount,
  due_date,
  late_fee_amount,
  academic_year_id,
  class_id,
  academic_years ( id, name ),
  classes ( id, name )
`;

export async function listFeeStructures() {
  return supabase
    .from("fee_structures")
    .select(feeStructureSelect)
    .order("created_at", { ascending: false });
}

export async function insertFeeStructure(row) {
  return supabase.from("fee_structures").insert(row).select(feeStructureSelect).single();
}

export async function updateFeeStructure(id, row) {
  return supabase.from("fee_structures").update(row).eq("id", id).select(feeStructureSelect).single();
}

export async function deleteFeeStructure(id) {
  return supabase.from("fee_structures").delete().eq("id", id);
}

const studentFeeSelect = `
  id,
  amount_due,
  amount_paid,
  status,
  student_id,
  fee_structure_id,
  created_at,
  students ( id, student_code, full_name, class_id, section_id, academic_year_id ),
  fee_structures ( id, name, total_amount, academic_year_id, class_id )
`;

export async function listStudentFees({ academicYearId, status }) {
  let feeStructureIds = null;
  if (academicYearId) {
    const { data: structs, error: e0 } = await supabase
      .from("fee_structures")
      .select("id")
      .eq("academic_year_id", academicYearId);
    if (e0) return { data: null, error: e0 };
    feeStructureIds = (structs ?? []).map((s) => s.id);
    if (!feeStructureIds.length) {
      return { data: [], error: null };
    }
  }

  let q = supabase
    .from("student_fees")
    .select(studentFeeSelect)
    .order("created_at", { ascending: false });

  if (feeStructureIds) {
    q = q.in("fee_structure_id", feeStructureIds);
  }
  if (status) {
    q = q.eq("status", status);
  }

  return await q;
}

/** Students in the same class/year as the fee structure without this fee yet. */
export async function listStudentsMissingFee(feeStructureId) {
  const { data: structure, error: e1 } = await supabase
    .from("fee_structures")
    .select("id, academic_year_id, class_id, total_amount")
    .eq("id", feeStructureId)
    .single();

  if (e1 || !structure) {
    return { students: [], error: e1 };
  }

  const { data: existing, error: e2 } = await supabase
    .from("student_fees")
    .select("student_id")
    .eq("fee_structure_id", feeStructureId);

  if (e2) return { students: [], error: e2 };

  const have = new Set((existing ?? []).map((r) => r.student_id));

  let q = supabase
    .from("students")
    .select("id, student_code, full_name")
    .eq("academic_year_id", structure.academic_year_id)
    .eq("class_id", structure.class_id)
    .order("full_name", { ascending: true });

  const { data: roster, error: e3 } = await q;
  if (e3) return { students: [], error: e3 };

  const students = (roster ?? []).filter((s) => !have.has(s.id));
  return { students, structure, error: null };
}

export async function assignFeeToStudents(feeStructureId, studentIds, amountDue) {
  if (!studentIds.length) return { error: null };
  const rows = studentIds.map((student_id) => ({
    student_id,
    fee_structure_id: feeStructureId,
    amount_due: amountDue,
    amount_paid: 0,
    status: "pending",
  }));
  return supabase.from("student_fees").insert(rows);
}

export async function assignFeeToAllInClass(feeStructureId) {
  const { students, structure, error } = await listStudentsMissingFee(feeStructureId);
  if (error) return { error };
  const ids = students.map((s) => s.id);
  return assignFeeToStudents(feeStructureId, ids, structure.total_amount);
}

function nextReceiptNumber() {
  return `RCP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function feeStatusFromAmounts(due, paid) {
  const d = Number(due);
  const p = Number(paid);
  if (p <= 0) return "pending";
  if (p >= d) return "paid";
  return "partial";
}

export async function recordPayment(studentFeeId, { amount, method, reference }) {
  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return { data: null, error: { message: "Amount must be positive" } };
  }

  const { data: sf, error: e1 } = await supabase
    .from("student_fees")
    .select("id, amount_due, amount_paid")
    .eq("id", studentFeeId)
    .single();

  if (e1 || !sf) {
    return {
      data: null,
      error: e1 ?? { message: "Fee record not found" },
    };
  }

  const { data: payment, error: e2 } = await supabase
    .from("payments")
    .insert({
      student_fee_id: studentFeeId,
      amount: amt,
      method: method?.trim() || null,
      reference: reference?.trim() || null,
    })
    .select("id")
    .single();

  if (e2) return { data: null, error: e2 };

  const newPaid = Number(sf.amount_paid) + amt;
  const status = feeStatusFromAmounts(sf.amount_due, newPaid);

  const { error: e3 } = await supabase
    .from("student_fees")
    .update({
      amount_paid: newPaid,
      status,
    })
    .eq("id", studentFeeId);

  if (e3) return { data: null, error: e3 };

  const receiptNo = nextReceiptNumber();
  const { data: receipt, error: e4 } = await supabase
    .from("receipts")
    .insert({
      payment_id: payment.id,
      receipt_number: receiptNo,
    })
    .select("id, receipt_number, issued_at")
    .single();

  if (e4) return { data: { payment, receiptError: e4 }, error: null };

  void logAdminActivity({
    action: "fee.payment",
    entityType: "student_fee",
    entityId: studentFeeId,
    summary: `Receipt ${receiptNo} — ${amt}`,
    metadata: { receipt_number: receiptNo, payment_id: payment.id },
  });

  return {
    data: { payment, receipt, newPaid, status },
    error: null,
  };
}

export async function listRecentReceipts(limit = 50) {
  return supabase
    .from("receipts")
    .select(
      `
      id,
      receipt_number,
      issued_at,
      payments (
        amount,
        paid_at,
        method,
        reference,
        student_fees (
          students ( student_code, full_name ),
          fee_structures ( name )
        )
      )
    `
    )
    .order("issued_at", { ascending: false })
    .limit(limit);
}
