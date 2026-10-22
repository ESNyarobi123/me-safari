'use client';

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@heroui/react';
import { ApiError, queryString, request, requestEnvelope, type Envelope } from './api';
import { requestReauthProof } from './reauth';

/* ------------------------------------------------------------------- reads -- */

export interface ListResult<T> {
  rows: T[];
  meta: Envelope<T[]>['meta'];
}

/**
 * Reads a paginated collection. The API returns a bare array plus a `meta`
 * envelope carrying `limit` / `hasMore` / `nextCursor`.
 */
export function useList<T>(
  path: string | null,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; key?: QueryKey } = {},
) {
  const search = queryString(params);
  return useQuery<ListResult<T>>({
    queryKey: options.key ?? ['list', path, search],
    enabled: Boolean(path) && options.enabled !== false,
    queryFn: async () => {
      const envelope = await requestEnvelope<T[]>(`${path}${search}`);
      return { rows: Array.isArray(envelope.data) ? envelope.data : [], meta: envelope.meta };
    },
  });
}

/** Reads a free-form object endpoint (summary, settings, policy, overview…). */
export function useApi<T>(
  path: string | null,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; key?: QueryKey } = {},
) {
  const search = queryString(params);
  return useQuery<T>({
    queryKey: options.key ?? ['api', path, search],
    enabled: Boolean(path) && options.enabled !== false,
    queryFn: () => request<T>(`${path}${search}`),
  });
}

/* --------------------------------------------------------------- commands -- */

export interface CommandOptions {
  /** Query keys to invalidate after a successful command. */
  invalidate?: QueryKey[];
  /** Success toast copy. Pass `false` to stay silent. */
  successMessage?: string | false;
  onSuccess?: (data: unknown) => void;
}

export interface CommandInput {
  body?: unknown;
  /** Extra query parameters for DELETE-style operations. */
  query?: Record<string, unknown>;
  /** Override the toast copy for this call; `false` stays silent. */
  successMessage?: string | false;
  /**
   * Sensitive permission the API re-authenticates (e.g. `refund.approve`).
   * When set, the console asks for the operator's password first and sends the
   * single-use proof as `X-Reauthentication-Token`.
   */
  reauth?: string;
}

export type RunCommand = <T = unknown>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  input?: CommandInput,
) => Promise<T>;

/**
 * Wraps every write in the console: idempotency, optimistic cache invalidation
 * and consistent success/failure toasts.
 */
export function useCommand(options: CommandOptions = {}): {
  run: RunCommand;
  pending: boolean;
} {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ path, method, input }: { path: string; method: string; input?: CommandInput }) => {
      let reauthToken: string | undefined;
      if (input?.reauth) {
        const proof = await requestReauthProof(input.reauth);
        if (!proof) {
          throw new ApiError(403, 'REAUTHENTICATION_CANCELLED', 'Password confirmation was cancelled.', {
            action: input.reauth,
          });
        }
        reauthToken = proof;
      }
      return request(`${path}${queryString(input?.query ?? {})}`, {
        method: method as 'POST' | 'PATCH' | 'PUT' | 'DELETE',
        body: input?.body,
        reauthToken,
      });
    },
    onSuccess: (data, variables) => {
      for (const key of options.invalidate ?? []) client.invalidateQueries({ queryKey: key });
      const message = variables.input?.successMessage ?? options.successMessage;
      if (message !== false) {
        toast.success(typeof message === 'string' ? message : 'Saved.', {
          description: 'The change is now live across the console.',
        });
      }
      options.onSuccess?.(data);
    },
    onError: (error) => {
      toast.danger(errorTitle(error), { description: errorMessage(error) });
    },
  });

  const run = useCallback<RunCommand>(
    (path, method, input) => mutation.mutateAsync({ path, method, input }) as Promise<never>,
    [mutation],
  );

  return { run, pending: mutation.isPending };
}

export function errorTitle(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Not permitted';
    if (error.status === 404) return 'Not found';
    if (error.status === 409) return 'Conflict — refresh and retry';
    if (error.status === 422 || error.status === 400) return 'Check the highlighted fields';
    if (error.status === 429) return 'Slow down';
    if (error.status >= 500) return 'Server problem';
  }
  return 'Something went wrong';
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = (error.details as { fields?: Array<{ field: string; message: string }> } | undefined)?.fields;
    if (fields?.length) {
      return fields.map((field) => `${field.field || 'form'}: ${field.message}`).join(' · ');
    }
    return error.message;
  }
  if (error instanceof TypeError) return 'Cannot reach the API.';
  return error instanceof Error ? error.message : 'Unexpected error.';
}

/* ----------------------------------------------------------------- filters -- */

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Small helper for cursor/offset pagination state driven by the API envelope. */
export function usePagination(initialLimit = 20) {
  const [limit] = useState(initialLimit);
  const cursorStack = useRef<Array<string | null>>([null]);
  const [index, setIndex] = useState(0);

  const cursor = cursorStack.current[index] ?? undefined;

  const next = useCallback(
    (nextCursor: string | null | undefined) => {
      if (!nextCursor) return;
      cursorStack.current = cursorStack.current.slice(0, index + 1).concat(nextCursor);
      setIndex((value) => value + 1);
    },
    [index],
  );

  const previous = useCallback(() => setIndex((value) => Math.max(0, value - 1)), []);
  const reset = useCallback(() => {
    cursorStack.current = [null];
    setIndex(0);
  }, []);

  return useMemo(
    () => ({ limit, cursor, next, previous, reset, page: index + 1, atStart: index === 0 }),
    [cursor, index, limit, next, previous, reset],
  );
}
