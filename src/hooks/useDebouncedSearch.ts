import React, { useState, useEffect, useCallback, useMemo } from "react";

interface UseDebouncedSearchOptions<T> {
  /** Items to search through */
  items: T[];
  /** Keys to search in each item */
  searchKeys: (keyof T)[];
  /** Debounce delay in ms */
  delay?: number;
  /** Minimum characters before searching */
  minLength?: number;
}

interface UseDebouncedSearchResult<T> {
  /** Current search query */
  query: string;
  /** Set search query */
  setQuery: (query: string) => void;
  /** Filtered results */
  results: T[];
  /** Whether search is in progress (debouncing) */
  isSearching: boolean;
  /** Clear search */
  clearSearch: () => void;
  /** Highlight matching text in a string */
  highlightMatch: (text: string) => React.ReactNode;
}

/**
 * P1-05: useDebouncedSearch - 防抖搜索 Hook
 * - 自动防抖，减少搜索触发频率
 * - 支持多字段搜索
 * - 提供高亮匹配文本的工具函数
 */
export function useDebouncedSearch<T extends Record<string, unknown>>({
  items,
  searchKeys,
  delay = 300,
  minLength = 1,
}: UseDebouncedSearchOptions<T>): UseDebouncedSearchResult<T> {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Debounce the search query
  useEffect(() => {
    if (query.length < minLength) {
      setDebouncedQuery("");
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay, minLength]);

  // Filter results based on debounced query
  const results = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < minLength) {
      return items;
    }

    const lowerQuery = debouncedQuery.toLowerCase();

    return items.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        if (typeof value === "string") {
          return value.toLowerCase().includes(lowerQuery);
        }
        if (Array.isArray(value)) {
          return value.some(
            (v) =>
              typeof v === "string" && v.toLowerCase().includes(lowerQuery)
          );
        }
        return false;
      })
    );
  }, [items, searchKeys, debouncedQuery, minLength]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setIsSearching(false);
  }, []);

  // Highlight matching text - returns JSX
  const highlightMatch = useCallback(
    (text: string): React.ReactNode => {
      if (!debouncedQuery || debouncedQuery.length < minLength) {
        return text;
      }

      const lowerText = text.toLowerCase();
      const lowerQuery = debouncedQuery.toLowerCase();
      const index = lowerText.indexOf(lowerQuery);

      if (index === -1) {
        return text;
      }

      const before = text.slice(0, index);
      const match = text.slice(index, index + debouncedQuery.length);
      const after = text.slice(index + debouncedQuery.length);

      return React.createElement(
        React.Fragment,
        null,
        before,
        React.createElement(
          "mark",
          { className: "bg-primary/30 text-foreground rounded px-0.5" },
          match
        ),
        after
      );
    },
    [debouncedQuery, minLength]
  );

  return {
    query,
    setQuery,
    results,
    isSearching,
    clearSearch,
    highlightMatch,
  };
}

/**
 * Simple debounced value hook
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebouncedSearch;
