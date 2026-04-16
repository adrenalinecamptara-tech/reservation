import { createServiceClient } from "@/lib/db/supabase";
import type { Package } from "@/lib/db/types";

export async function listPackages(onlyActive = false): Promise<Package[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("packages")
    .select("*")
    .order("sort_order", { ascending: true });

  if (onlyActive) query = query.eq("status", "active");

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list packages: ${error.message}`);
  return data ?? [];
}

export async function updatePackage(
  id: string,
  data: Partial<Omit<Package, "id" | "created_at">>
): Promise<Package> {
  const supabase = createServiceClient();
  const { data: pkg, error } = await supabase
    .from("packages")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error || !pkg) throw new Error(`Failed to update package: ${error?.message}`);
  return pkg;
}

export async function createPackage(
  data: Omit<Package, "id" | "created_at">
): Promise<Package> {
  const supabase = createServiceClient();
  const { data: pkg, error } = await supabase
    .from("packages")
    .insert(data)
    .select()
    .single();

  if (error || !pkg) throw new Error(`Failed to create package: ${error?.message}`);
  return pkg;
}
