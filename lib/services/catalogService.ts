import { createServiceClient } from "@/lib/db/supabase";
import type { ServiceCatalogItem } from "@/lib/db/types";

export async function listCatalog(
  onlyActive = false,
): Promise<ServiceCatalogItem[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("service_catalog")
    .select("*")
    .order("sort_order", { ascending: true });
  if (onlyActive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to list catalog: ${error.message}`);
  return (data ?? []) as ServiceCatalogItem[];
}

export async function getCatalogItem(
  code: string,
): Promise<ServiceCatalogItem | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("service_catalog")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ServiceCatalogItem) ?? null;
}

export async function upsertCatalogItem(
  item: Omit<ServiceCatalogItem, "created_at" | "updated_at">,
): Promise<ServiceCatalogItem> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("service_catalog")
    .upsert(item, { onConflict: "code" })
    .select()
    .single();
  if (error || !data)
    throw new Error(`Failed to upsert catalog item: ${error?.message}`);
  return data as ServiceCatalogItem;
}

export async function updateCatalogItem(
  code: string,
  patch: Partial<Omit<ServiceCatalogItem, "code" | "created_at" | "updated_at">>,
): Promise<ServiceCatalogItem> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("service_catalog")
    .update(patch)
    .eq("code", code)
    .select()
    .single();
  if (error || !data)
    throw new Error(`Failed to update catalog: ${error?.message}`);
  return data as ServiceCatalogItem;
}

export async function deleteCatalogItem(code: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("service_catalog")
    .delete()
    .eq("code", code);
  if (error) throw new Error(error.message);
}

export function catalogByCode(
  items: ServiceCatalogItem[],
): Map<string, ServiceCatalogItem> {
  return new Map(items.map((i) => [i.code, i]));
}
