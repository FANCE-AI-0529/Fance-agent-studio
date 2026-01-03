import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SkillBundle } from "./useSkillBundles";

export function useBundlesByCategory(category: string | null, searchQuery?: string) {
  return useQuery({
    queryKey: ["skill_bundles", "category", category, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("skill_bundles")
        .select("*")
        .order("downloads_count", { ascending: false });

      // Filter by category (skip if "all" or null)
      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      // Filter by search query
      if (searchQuery && searchQuery.trim()) {
        query = query.or(
          `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SkillBundle[];
    },
  });
}

export function useFeaturedBundlesWithCategory(limit = 4) {
  return useQuery({
    queryKey: ["skill_bundles", "featured", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_bundles")
        .select("*")
        .eq("is_featured", true)
        .order("downloads_count", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SkillBundle[];
    },
  });
}
