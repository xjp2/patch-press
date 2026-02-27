import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const globalCache = new Map<string, CacheEntry<any>>();
const FETCH_TIMEOUT = 10000; // 10 seconds max for any fetch

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    enabled?: boolean;
    staleTime?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { enabled = true, staleTime = CACHE_DURATION, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchRef = useRef<number>(0);
  const hasFetchedRef = useRef(false);

  const fetchData = useCallback(async (force = false) => {
    // Check cache first
    const cached = globalCache.get(key);
    const now = Date.now();
    
    if (!force && cached && (now - cached.timestamp) < staleTime) {
      setData(cached.data);
      setIsLoading(false);
      onSuccess?.(cached.data);
      return;
    }

    // Prevent duplicate requests within 1 second
    if (!force && (now - lastFetchRef.current) < 1000) {
      return;
    }
    lastFetchRef.current = now;

    setIsLoading(true);
    setError(null);

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), FETCH_TIMEOUT);
    });

    try {
      // Race between fetch and timeout
      const result = await Promise.race([fetcher(), timeoutPromise]);
      globalCache.set(key, { data: result, timestamp: now });
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      console.error(`useCachedData[${key}]:`, err);
      const error = err instanceof Error ? err : new Error('Failed to fetch');
      setError(error);
      onError?.(error);
      // Use stale cache if available
      if (cached) {
        setData(cached.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, staleTime, onSuccess]);

  useEffect(() => {
    if (enabled && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData();
    }
  }, [enabled, fetchData]);
  
  // Safety timeout: force clear loading after 15 seconds
  useEffect(() => {
    if (!isLoading) return;
    
    const safetyTimeout = setTimeout(() => {
      console.warn(`useCachedData[${key}]: Safety timeout reached, forcing loading clear`);
      setIsLoading(false);
    }, 15000);
    
    return () => clearTimeout(safetyTimeout);
  }, [isLoading, key]);

  const invalidate = useCallback(() => {
    globalCache.delete(key);
    return fetchData(true);
  }, [key, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchData(true),
    invalidate,
  };
}

// Optimistic update helper
export function useOptimisticUpdate<T>() {
  const [pending, setPending] = useState(false);

  const update = useCallback(async (
    updater: () => Promise<T>,
    options: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
    } = {}
  ) => {
    setPending(true);
    try {
      const result = await updater();
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Update failed');
      options.onError?.(error);
      throw error;
    } finally {
      setPending(false);
    }
  }, []);

  return { update, pending };
}
