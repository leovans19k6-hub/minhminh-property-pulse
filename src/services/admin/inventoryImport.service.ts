import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "../_helpers";

export type ImportJobRow = Database["public"]["Tables"]["inventory_import_jobs"]["Row"];
export type ImportJobInsert = Database["public"]["Tables"]["inventory_import_jobs"]["Insert"];
export type ImportRowRow = Database["public"]["Tables"]["inventory_import_rows"]["Row"];

export interface ImportRowPayload {
  row_number: number;
  product_code: string;
  raw_data: {
    core?: Record<string, unknown>;
    custom?: Array<{
      field_key: string;
      value_text?: string;
      value_integer?: number;
      value_decimal?: number;
      value_boolean?: boolean;
      value_date?: string;
      value_datetime?: string;
      value_jsonb?: unknown;
    }>;
  };
}

export async function listImportJobs(projectId: string): Promise<ImportJobRow[]> {
  return unwrap(
    await supabase
      .from("inventory_import_jobs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50),
    "import.jobs.list",
  );
}

export async function getImportJob(id: string): Promise<ImportJobRow | null> {
  return unwrapMaybe<ImportJobRow>(
    await supabase.from("inventory_import_jobs").select("*").eq("id", id).maybeSingle(),
    "import.jobs.get",
  );
}

export async function listImportRows(jobId: string): Promise<ImportRowRow[]> {
  return unwrap(
    await supabase
      .from("inventory_import_rows")
      .select("*")
      .eq("import_job_id", jobId)
      .order("row_number", { ascending: true }),
    "import.rows.list",
  );
}

export async function createImportJob(input: {
  projectId: string;
  fileName: string;
  importType?: string;
  metadata?: Record<string, unknown>;
}): Promise<ImportJobRow> {
  const insert: ImportJobInsert = {
    project_id: input.projectId,
    file_name: input.fileName,
    import_type: input.importType ?? "products",
    metadata: (input.metadata ?? {}) as never,
    status: "pending",
  };
  return unwrap(
    await supabase.from("inventory_import_jobs").insert(insert).select("*").single(),
    "import.jobs.create",
  );
}

export async function addImportRows(jobId: string, rows: ImportRowPayload[]): Promise<number> {
  const res = await supabase.rpc("inventory_import_add_rows", {
    p_job_id: jobId,
    p_rows: rows as unknown as never,
  });
  if (res.error) throw new ServiceError(res.error.message, res.error);
  return res.data as unknown as number;
}

export async function commitImport(jobId: string): Promise<{ success: number; failed: number }> {
  const res = await supabase.rpc("commit_inventory_import", { p_job_id: jobId });
  if (res.error) throw new ServiceError(res.error.message, res.error);
  return res.data as unknown as { success: number; failed: number };
}

/** Very small CSV parser: handles quoted values with commas / newlines / escaped quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { cur.push(field); field = ""; i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}