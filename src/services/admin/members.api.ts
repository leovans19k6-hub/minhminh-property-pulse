import { supabase } from "@/api/client";

export async function searchEligibleMembers(input: {
  projectId: string;
  query?: string;
  limit?: number;
}) {
  const { data, error } = await supabase.functions.invoke(
    "admin-members-search",
    {
      body: input,
    },
  );

  if (error) throw error;

  return data;
}