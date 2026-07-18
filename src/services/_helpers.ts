import type { PostgrestError } from "@supabase/supabase-js";

export class ServiceError extends Error {
  constructor(message: string, public cause?: PostgrestError | Error | null) {
    super(message);
    this.name = "ServiceError";
  }
}

export function unwrap<T>(
  res: { data: T | null; error: PostgrestError | null },
  ctx: string,
): T {
  if (res.error) {
    throw new ServiceError(`[${ctx}] ${res.error.message}`, res.error);
  }

  if (res.data === null) {
    throw new ServiceError(`[${ctx}] no data returned`);
  }

  return res.data;
}

export function unwrapMaybe<T>(
  res: { data: T | null; error: PostgrestError | null },
  ctx: string,
): T | null {
  if (res.error) {
    throw new ServiceError(`[${ctx}] ${res.error.message}`, res.error);
  }

  return res.data;
}

export function ensureSuccess(
  error: PostgrestError | null,
  ctx: string,
): void {
  if (error) {
    throw new ServiceError(`[${ctx}] ${error.message}`, error);
  }
}