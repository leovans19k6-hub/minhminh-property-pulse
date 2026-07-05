import { supabase } from "@/integrations/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

export type InventoryRealtimeTable =
  | "products"
  | "product_price_options"
  | "sales_policies"
  | "vouchers"
  | "events";

export interface RealtimeSubscribeOptions {
  table: InventoryRealtimeTable;
  filter?: string; // e.g. `project_id=eq.<uuid>`
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  channelName?: string;
}

/**
 * Subscribe to Postgres changes on an inventory-critical table.
 * ALWAYS call the returned unsubscribe fn on cleanup (e.g. useEffect return).
 */
export function subscribeToInventory(opts: RealtimeSubscribeOptions): () => void {
  const name = opts.channelName ?? `rt:${opts.table}:${opts.filter ?? "all"}`;
  const channel: RealtimeChannel = supabase
    .channel(name)
    .on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: "*",
        schema: "public",
        table: opts.table,
        ...(opts.filter ? { filter: opts.filter } : {}),
      },
      opts.onChange,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}