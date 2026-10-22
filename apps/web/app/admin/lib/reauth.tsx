'use client';

import { Button, Modal, TextField, Input, Label, toast, useOverlayState } from '@heroui/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_BASE, ApiError, readAccess } from './api';

/**
 * Sensitive admin actions (access changes, refund approvals, settings
 * publication, offline verification, reassignment, confirmation overrides)
 * require a fresh password proof. The API accepts a single-use token bound to
 * one action and one session, so the console asks for the password at the
 * moment the command runs rather than holding a long-lived unlock.
 */

interface PendingRequest {
  action: string;
  resolve: (token: string | null) => void;
}

export interface ReauthRequest {
  action: string;
}

type Prompt = (action: string) => Promise<string | null>;

let promptHandler: Prompt | null = null;

/** Called by the command layer; resolves with a token or null when cancelled. */
export function requestReauthProof(action: string): Promise<string | null> {
  if (!promptHandler) return Promise.resolve(null);
  return promptHandler(action);
}

const ACTION_LABELS: Record<string, string> = {
  'access.manage': 'change who can access the console',
  'staff.manage': 'invite, suspend or reactivate a team member',
  'settings.manage': 'publish company settings or booking policy',
  'refund.approve': 'approve a traveller refund',
  'finance.adjustment': 'record a financial adjustment',
  'finance.offline_verify': 'verify an offline payment',
  'assignment.manage': 'reassign or correct a live trip',
  'booking.confirm_override': 'confirm a booking with an exception',
};

export function describeAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

interface ReauthContextValue {
  /** Manually trigger a proof (used by pages that want an explicit unlock step). */
  request: (action: string) => Promise<string | null>;
}

const ReauthContext = createContext<ReauthContextValue | null>(null);

export function useReauth(): ReauthContextValue {
  const context = useContext(ReauthContext);
  if (!context) throw new Error('useReauth must be used inside <AdminProviders>.');
  return context;
}

async function obtainToken(action: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/reauthenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${readAccess() ?? ''}`,
      'X-Role-Context': 'ADMIN',
    },
    body: JSON.stringify({ password, action }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { data?: { reauthToken?: string }; error?: { message?: string; code?: string } }
    | null;
  if (!response.ok || !payload?.data?.reauthToken) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'REAUTHENTICATION_FAILED',
      payload?.error?.message ?? 'Password confirmation failed.',
    );
  }
  return payload.data.reauthToken;
}

export function ReauthProvider({ children }: { children: ReactNode }) {
  const state = useOverlayState();
  const [action, setAction] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<PendingRequest | null>(null);

  const open = useCallback(
    (action: string) =>
      new Promise<string | null>((resolve) => {
        pending.current?.resolve(null);
        pending.current = { action, resolve };
        setAction(action);
        setPassword('');
        setError(null);
        state.open();
      }),
    [state],
  );

  const settle = useCallback(
    (token: string | null) => {
      pending.current?.resolve(token);
      pending.current = null;
      state.close();
    },
    [state],
  );

  const value = useMemo<ReauthContextValue>(() => ({ request: open }), [open]);

  // Register the module-level handler that the command layer calls into.
  useEffect(() => {
    promptHandler = (nextAction: string) => open(nextAction);
    return () => {
      promptHandler = null;
    };
  }, [open]);

  return (
    <ReauthContext.Provider value={value}>
      {children}
      <Modal
        isOpen={state.isOpen}
        onOpenChange={(next) => {
          if (!next) settle(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Confirm your password</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body className="space-y-3">
                <p className="text-sm text-muted">
                  You are about to <strong className="text-foreground">{action ? describeAction(action) : 'perform a sensitive action'}</strong>.
                  This step keeps accidental or shared sessions from changing money and access.
                </p>
                <TextField className="w-full" fullWidth value={password} onChange={setPassword}>
                  <Label>Your password</Label>
                  <Input type="password" autoFocus autoComplete="current-password" placeholder="••••••••••••" />
                </TextField>
                {error ? <p className="text-xs text-danger">{error}</p> : null}
                <p className="text-xs text-muted">
                  The proof is valid for five minutes, for this single action only, and is consumed when the command succeeds.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" isDisabled={busy} onPress={() => settle(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  isPending={busy}
                  isDisabled={password.length < 8}
                  onPress={async () => {
                    if (!action) return;
                    setBusy(true);
                    setError(null);
                    try {
                      const token = await obtainToken(action, password);
                      setBusy(false);
                      settle(token);
                    } catch (cause) {
                      setBusy(false);
                      const message = cause instanceof Error ? cause.message : 'Password confirmation failed.';
                      setError(message);
                      toast.danger('Not confirmed', { description: message });
                    }
                  }}
                >
                  Confirm
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </ReauthContext.Provider>
  );
}
