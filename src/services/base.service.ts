import { supabase } from "@/api/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export abstract class BaseService {
    protected readonly db: SupabaseClient;

    constructor(client: SupabaseClient = supabase) {
        this.db = client;
    }

    protected unwrap<T>(
        result: {
            data: T | null;
            error: { message: string } | null;
        }
    ): T {
        if (result.error) {
            throw new Error(result.error.message);
        }

        return result.data as T;
    }
}