-- Fix remaining function with missing search_path
ALTER FUNCTION public.update_graph_updated_at() SET search_path = public;