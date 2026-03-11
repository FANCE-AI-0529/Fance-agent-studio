import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import type { Tables } from "../integrations/supabase/types.ts";
import type { MCPTool, MCPResource } from "../components/foundry/MCPToolsList.tsx";

export type MarketSkill = Tables<"skills"> & {
  author?: { display_name: string | null } | null;
  // MCP specific fields (from DB)
  origin?: string | null;
  mcp_type?: string | null;
  transport_url?: string | null;
  runtime_env?: string | null;
  scope?: string | null;
  is_official?: boolean | null;
  mcp_tools?: MCPTool[] | null;
  mcp_resources?: MCPResource[] | null;
  github_stars?: number | null;
};

export type SkillOriginFilter = "all" | "native" | "mcp";

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
export function useSkillSearch(query: string, category?: string, origin?: SkillOriginFilter) {
  return useQuery({
    queryKey: ["skills", "search", query, category, origin],
    queryFn: async () => {
      let q = supabase
        .from("skills")
        .select("*")
        .eq("is_published", true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

      if (category && category !== "all") {
        q = q.eq("category", category);
      }

      if (origin && origin !== "all") {
        q = q.eq("origin", origin);
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

// Fetch all market skills with filters (including MCP origin filter)
export function useMarketSkills(options: {
  category?: string;
  sortBy?: "popular" | "newest" | "rating";
  priceFilter?: "all" | "free" | "paid";
  origin?: SkillOriginFilter;
  limit?: number;
}) {
  const { category, sortBy = "popular", priceFilter = "all", origin = "all", limit = 50 } = options;

  return useQuery({
    queryKey: ["skills", "market", category, sortBy, priceFilter, origin, limit],
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

      // Origin filter for MCP/Native
      if (origin && origin !== "all") {
        q = q.eq("origin", origin);
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

// Fetch MCP skills only
export function useMCPSkills(category?: string, limit = 50) {
  return useQuery({
    queryKey: ["skills", "mcp", category, limit],
    queryFn: async () => {
      let q = supabase
        .from("skills")
        .select("*")
        .eq("is_published", true)
        .eq("origin", "mcp");

      if (category && category !== "all") {
        q = q.eq("category", category);
      }

      const { data, error } = await q
        .order("github_stars", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MarketSkill[];
    },
  });
}
