/**
 * Centralized runtime configuration + environment validation.
 * Read once at module load; throws a clear error early if required
 * public env vars are missing.
 */

type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  mode: string;
  isProd: boolean;
};

function readPublicEnv(): PublicEnv {
  const supabaseUrl =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
    (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined);
  const supabaseAnonKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (typeof process !== "undefined" ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined);

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (missing.length) {
    throw new Error(
      `Missing required env: ${missing.join(", ")}. Connect Lovable Cloud.`,
    );
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
    mode: import.meta.env.MODE,
    isProd: import.meta.env.PROD,
  };
}

let cached: PublicEnv | undefined;
export function getRuntimeConfig(): PublicEnv {
  if (!cached) cached = readPublicEnv();
  return cached;
}

/** Runtime tuning constants (single source of truth). */
export const runtimeTuning = {
  /** Default per-query timeout in ms (network requests should abort past this). */
  queryTimeoutMs: 20_000,
  /** Max retry attempts for transient network failures. */
  queryMaxRetries: 2,
  /** Base backoff in ms; capped at 8s. */
  retryBackoff: (attempt: number) => Math.min(1000 * 2 ** attempt, 8000),
} as const;