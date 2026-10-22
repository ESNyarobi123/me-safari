'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PortalApiError, portalRequest } from './api';

interface ResourceState<T> {
  data: T | null;
  error: PortalApiError | null;
  loading: boolean;
  updatedAt: number | null;
}

/**
 * Small authenticated read helper for the portal. Keeps the previous payload
 * visible during a refresh so the page does not flash between states.
 */
export function usePortalResource<T>(path: string | null, enabled = true) {
  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    error: null,
    loading: Boolean(path && enabled),
    updatedAt: null,
  });
  const sequence = useRef(0);

  const load = useCallback(
    async (signal?: AbortSignal, quiet = false) => {
      if (!path || !enabled) {
        setState({ data: null, error: null, loading: false, updatedAt: null });
        return;
      }
      const requestId = ++sequence.current;
      setState((previous) => ({
        ...previous,
        loading: quiet ? previous.loading : true,
        error: quiet ? previous.error : null,
      }));
      try {
        const data = await portalRequest<T>(path, { signal });
        if (requestId === sequence.current && !signal?.aborted) {
          setState({ data, error: null, loading: false, updatedAt: Date.now() });
        }
      } catch (error) {
        if (signal?.aborted || requestId !== sequence.current) return;
        const failure =
          error instanceof PortalApiError
            ? error
            : new PortalApiError(0, 'REQUEST_FAILED', 'The request could not be completed.');
        setState((previous) => ({ ...previous, error: failure, loading: false }));
      }
    },
    [enabled, path],
  );

  useEffect(() => {
    const controller = new AbortController();
    if (enabled) void load(controller.signal);
    else setState({ data: null, error: null, loading: false, updatedAt: null });
    return () => controller.abort();
  }, [enabled, load]);

  const reload = useCallback(async () => {
    await load(undefined, true);
  }, [load]);

  return { ...state, reload };
}

/** Reads a query-string value without triggering the static-export Suspense requirement. */
export function readQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

export function safePortalNext(value: string | null | undefined): string {
  if (!value) return '/portal/';
  if (!/^\/portal(?:\/|$|\?)/.test(value)) return '/portal/';
  if (value.startsWith('//') || value.includes('..') || value.includes('\\')) return '/portal/';
  return value;
}
