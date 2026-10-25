'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { ANDROID_APP, ANDROID_PAGE_PATH } from '../lib/app-release';

const STORAGE_KEY = 'ma-app-download-popup-dismissed';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 4500;
const RETRY_DELAY_MS = 9000;

function dismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * Floating download card for the Android app.
 *
 * Deliberately non-modal: it never traps focus and never blocks the catalogue,
 * so it can appear while a visitor keeps browsing. The offer is snoozed for two
 * weeks after a dismissal, and it waits whenever a package dialog is already
 * open so two overlays never compete for attention.
 */
export default function AppDownloadPopup() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closed = useRef(false);

  const schedule = useCallback((delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (closed.current) return;
      // Never stack on top of an open dialog (package details, credits, …).
      if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) {
        schedule(RETRY_DELAY_MS);
        return;
      }
      setOpen(true);
    }, delay);
  }, []);

  useEffect(() => {
    if (dismissedRecently()) return;
    schedule(SHOW_DELAY_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [schedule]);

  const dismiss = useCallback(() => {
    closed.current = true;
    setOpen(false);
    if (timer.current) clearTimeout(timer.current);
    try { window.localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <aside className="ma-apppop" aria-labelledby="maAppPopTitle">
      <button type="button" className="ma-apppop-close" aria-label="Dismiss app download offer" onClick={dismiss}>
        <span aria-hidden="true">×</span>
      </button>

      <span className="ma-apppop-thumb" aria-hidden="true">
        <img src="/assets/app-screens/screen-explore.jpg" alt="" width="56" height="120" />
      </span>

      <div className="ma-apppop-body">
        <p className="ma-apppop-eyebrow">
          <Icon name="download" />
          <span>Android app · v{ANDROID_APP.version}</span>
        </p>
        <strong id="maAppPopTitle">Take the safari desk with you</strong>
        <p className="ma-apppop-copy">
          Offline itineraries, live Arusha pickup updates and a direct line to your planner — install the APK in a few taps.
        </p>
        <div className="ma-apppop-actions">
          <a className="ma-btn ma-btn-orange" href={ANDROID_PAGE_PATH}>Download app</a>
          <button type="button" className="ma-apppop-later" onClick={dismiss}>Maybe later</button>
        </div>
      </div>
    </aside>
  );
}
