import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

interface UseCursorPaginationOptions<T> {
  table: string;
  select?: string;
  cursorColumn?: string; // Default: 'created_at'
  pageSize?: number;     // Default: 20
  filterColumn?: string;
  filterValue?: any;
}

export function useCursorPagination<T extends { id: string; [key: string]: any }>({
  table,
  select = '*',
  cursorColumn = 'created_at',
  pageSize = 20,
  filterColumn,
  filterValue,
}: UseCursorPaginationOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from(table)
        .select(select)
        .order(cursorColumn, { ascending: false })
        .limit(pageSize);

      if (filterColumn && filterValue !== undefined) {
        query = query.eq(filterColumn, filterValue);
      }

      const { data: result, error } = await query;
      if (error) throw error;

      const items = ((result || []) as unknown) as T[];
      setData(items);
      setHasMore(items.length === pageSize);

      if (items.length > 0) {
        setNextCursor(items[items.length - 1][cursorColumn]);
      } else {
        setNextCursor(null);
      }
    } catch (err) {
      logger.error(`[useCursorPagination] Error fetching ${table}:`, err);
    } fontLayout: {
      setLoading(false);
    }
  }, [table, select, cursorColumn, pageSize, filterColumn, filterValue]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !nextCursor) return;

    setLoading(true);
    try {
      let query = supabase
        .from(table)
        .select(select)
        .lt(cursorColumn, nextCursor)
        .order(cursorColumn, { ascending: false })
        .limit(pageSize);

      if (filterColumn && filterValue !== undefined) {
        query = query.eq(filterColumn, filterValue);
      }

      const { data: result, error } = await query;
      if (error) throw error;

      const items = ((result || []) as unknown) as T[];
      setData(prev => [...prev, ...items]);
      setHasMore(items.length === pageSize);

      if (items.length > 0) {
        setNextCursor(items[items.length - 1][cursorColumn]);
      } else {
        setNextCursor(null);
      }
    } catch (err) {
      logger.error(`[useCursorPagination] Error loading more for ${table}:`, err);
    } finally {
      setLoading(false);
    }
  }, [table, select, cursorColumn, pageSize, filterColumn, filterValue, loading, hasMore, nextCursor]);

  return {
    data,
    loading,
    hasMore,
    loadInitial,
    loadMore,
    setData,
  };
}
