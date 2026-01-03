import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type MarketSkill = Tables<"skills"> & {
  author?: { display_name: string | null } | null;
};

// Fetch featured skills
export function useFeaturedSkills(limit = 6) {
  return useQuery({
    queryKey: ["skills", "featured", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("downloads_count", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MarketSkill[];
    },
  });
}

// Fetch popular skills by downloads
export function usePopularSkills(limit = 12) {
  return useQuery({
    queryKey: ["skills", "popular", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("is_published", true)
        .order("downloads_count", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MarketSkill[];
    },
  });
}

// Fetch newest skills
export function useNewSkills(limit = 12) {
  return useQuery({
    queryKey: ["skills", "new", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MarketSkill[];
    },
  });
}

// Fetch top rated skills
export function useTopRatedSkills(limit = 12) {
  return useQuery({
    queryKey: ["skills", "top-rated", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("is_published", true)
        .gt("ratings_count", 0)
        .order("rating", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MarketSkill[];
    },
  });
}

// Fetch skills by category
export function useSkillsByCategory(category: string, limit = 20) {
  return useQuery({
    queryKey: ["skills", "category", category, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("is_published", true)
        .eq("category", category)
        .order("downloads_count", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MarketSkill[];
    },
    enabled: !!category,
  });
}

// Search skills
export function useSkillSearch(query: string, category?: string) {
  return useQuery({
    queryKey: ["skills", "search", query, category],
    queryFn: async () => {
      let q = supabase
        .from("skills")
        .select("*")
        .eq("is_published", true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

      if (category && category !== "all") {
        q = q.eq("category", category);
      }

      const { data, error } = await q
        .order("downloads_count", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MarketSkill[];
    },
    enabled: query.length > 0,
  });
}

// Fetch all market skills with filters
export function useMarketSkills(options: {
  category?: string;
  sortBy?: "popular" | "newest" | "rating";
  priceFilter?: "all" | "free" | "paid";
  limit?: number;
}) {
  const { category, sortBy = "popular", priceFilter = "all", limit = 50 } = options;

  return useQuery({
    queryKey: ["skills", "market", category, sortBy, priceFilter, limit],
    queryFn: async () => {
      let q = supabase
        .from("skills")
        .select("*")
        .eq("is_published", true);

      if (category && category !== "all") {
        q = q.eq("category", category);
      }

      if (priceFilter === "free") {
        q = q.eq("is_free", true);
      } else if (priceFilter === "paid") {
        q = q.eq("is_free", false);
      }

      if (sortBy === "popular") {
        q = q.order("downloads_count", { ascending: false });
      } else if (sortBy === "newest") {
        q = q.order("created_at", { ascending: false });
      } else if (sortBy === "rating") {
        q = q.order("rating", { ascending: false });
      }

      const { data, error } = await q.limit(limit);

      if (error) throw error;
      return data as MarketSkill[];
    },
  });
}
