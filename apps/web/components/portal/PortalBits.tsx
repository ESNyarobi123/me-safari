'use client';

import type { ReactNode } from 'react';
import type { ItineraryContent, PortalApiError } from '../../lib/portal/api';
import { portalErrorMessage } from '../../lib/portal/auth';

export function PortalSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="ma-portal-skeletons" role="status" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="ma-portal-skeleton" />
      ))}
      <span className="ma-portal-sr">Loading your travel file…</span>
    </div>
  );
}

export function PortalError({ error, retry }: { error: PortalApiError; retry?: () => void }) {
  return (
    <div className="ma-portal-note is-error" role="alert">
      <strong>We hit a snag.</strong>
      <span>{portalErrorMessage(error)}</span>
      {retry ? (
        <button className="ma-portal-inline-link" type="button" onClick={retry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function PortalEmpty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ma-portal-empty">
      <span className="ma-portal-empty-mark" aria-hidden="true">✦</span>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

interface ItineraryValue {
  content?: ItineraryContent;
  days?: ItineraryContent['days'];
  inclusions?: string[];
  exclusions?: string[];
}

export function Itinerary({ value }: { value: ItineraryValue | ItineraryContent | null | undefined }) {
  if (!value) return null;
  const printable = value as ItineraryValue;
  const content: ItineraryContent =
    printable.content && typeof printable.content === 'object'
      ? printable.content
      : (value as ItineraryContent);
  const days = content.days ?? printable.days ?? [];
  const inclusions = content.inclusions ?? printable.inclusions ?? [];
  const exclusions = content.exclusions ?? printable.exclusions ?? [];

  if (!days.length && !inclusions.length && !exclusions.length) return null;

  return (
    <div className="ma-portal-itinerary">
      {days.length ? (
        <ol className="ma-portal-days">
          {days.map((day, index) => (
            <li key={`${day.day ?? index}-${day.title ?? 'day'}`}>
              <details open={index === 0}>
                <summary>
                  <b>Day {day.day ?? index + 1}</b>
                  <span>{day.title}</span>
                </summary>
                <div className="ma-portal-day-body">
                  {day.description ? <p>{day.description}</p> : null}
                  {day.activities?.length ? (
                    <ul>
                      {day.activities.map((activity, activityIndex) => (
                        <li key={`${activity.title ?? activityIndex}-${activityIndex}`}>
                          <strong>{activity.title ?? activity.description ?? 'Stop'}</strong>
                          {activity.customerText ? <span>{activity.customerText}</span> : null}
                          {!activity.customerText && activity.description ? <span>{activity.description}</span> : null}
                          {activity.location?.label ? <small>{activity.location.label}</small> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {day.accommodation ? (
                    <p className="ma-portal-day-stay"><small>Stay</small> {day.accommodation}</p>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ol>
      ) : null}

      {inclusions.length || exclusions.length ? (
        <div className="ma-portal-inclusions">
          {inclusions.length ? (
            <div>
              <h3>Included</h3>
              <ul>{inclusions.map((entry) => <li key={entry}>{entry}</li>)}</ul>
            </div>
          ) : null}
          {exclusions.length ? (
            <div className="is-muted">
              <h3>Not included</h3>
              <ul>{exclusions.map((entry) => <li key={entry}>{entry}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="ma-portal-field">
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}
