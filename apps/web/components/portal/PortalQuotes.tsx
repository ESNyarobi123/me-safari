'use client';

import { useEffect, useState } from 'react';
import {
  portalRequest,
  type BookingSummary,
  type Quote,
  type RequestDetail,
  type RequestSummary,
} from '../../lib/portal/api';
import { portalErrorMessage, usePortalAuth } from '../../lib/portal/auth';
import {
  dateLabel,
  dateRange,
  dateTimeLabel,
  money,
  statusLabel,
} from '../../lib/portal/format';
import { readQueryParam, usePortalResource } from '../../lib/portal/hooks';
import { Itinerary, PortalEmpty, PortalError, PortalSkeleton } from './PortalBits';
import { PortalPageHead, PortalShell, StatusChip } from './PortalShell';

export default function PortalQuotes() {
  const requests = usePortalResource<RequestSummary[]>('/custom-requests?limit=50');
  const bookings = usePortalResource<BookingSummary[]>('/bookings?limit=50');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);

  useEffect(() => {
    setRequestId(readQueryParam('request'));
    setQuoteId(readQueryParam('id'));
  }, []);

  useEffect(() => {
    const list = requests.data;
    if (!list?.length) return;
    setRequestId((current) => {
      if (current && list.some((request) => request.id === current)) return current;
      const withSent = list.find((request) => request.quotes.some((quote) => quote.state === 'SENT'));
      return (withSent ?? list[0]).id;
    });
  }, [requests.data]);

  const detail = usePortalResource<RequestDetail>(requestId ? `/custom-requests/${requestId}` : null);
  const quotes = detail.data?.quotes ?? [];
  const quote =
    quotes.find((entry) => entry.id === quoteId) ??
    quotes.find((entry) => entry.state === 'SENT') ??
    quotes[0] ??
    null;

  useEffect(() => {
    if (!requestId || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('request', requestId);
    if (quote?.id) url.searchParams.set('id', quote.id);
    else url.searchParams.delete('id');
    window.history.replaceState(null, '', url);
  }, [quote?.id, requestId]);

  const bookingForQuote =
    (bookings.data ?? []).find((booking) => booking.quoteId === quote?.id) ?? null;

  function selectRequest(nextRequestId: string) {
    setRequestId(nextRequestId);
    setQuoteId(null);
  }

  async function reloadAll() {
    await Promise.all([detail.reload(), requests.reload(), bookings.reload()]);
  }

  return (
    <PortalShell active="quotes">
      <PortalPageHead
        kicker="Proposals"
        title={<>Your <em>written proposals.</em></>}
        intro="Nothing is charged until you accept a proposal and pay the deposit. Ask for changes as often as you need."
        actions={<a className="ma-portal-btn is-quiet" href="/contact/">Plan another journey</a>}
      />

      {requests.loading && !requests.data ? <PortalSkeleton rows={3} /> : null}
      {requests.error ? <PortalError error={requests.error} retry={() => void requests.reload()} /> : null}

      {!requests.loading && !requests.error && !(requests.data ?? []).length ? (
        <PortalEmpty
          title="No proposals yet"
          action={<a className="ma-portal-btn is-primary" href="/contact/">Request your first journey</a>}
        >
          When the Arusha desk finishes your written itinerary and price, it appears here — and we
          email you a link straight back to it.
        </PortalEmpty>
      ) : null}

      {(requests.data ?? []).length ? (
        <div className="ma-portal-split">
          <aside className="ma-portal-side" aria-label="Your requests">
            <p className="ma-portal-side-title">Your requests</p>
            <div className="ma-portal-side-list" role="list">
              {(requests.data ?? []).map((request) => {
                const latest = request.quotes[0];
                const selected = request.id === requestId;
                return (
                  <button
                    key={request.id}
                    type="button"
                    role="listitem"
                    className={`ma-portal-side-item${selected ? ' is-active' : ''}`}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => selectRequest(request.id)}
                  >
                    <span className="ma-portal-side-top">
                      <strong>{request.service?.title ?? 'Tailor-made journey'}</strong>
                      <StatusChip status={request.status} />
                    </span>
                    <span className="ma-portal-side-meta">{dateRange(request.startDate, request.endDate)}</span>
                    <span className="ma-portal-side-foot">
                      <span>{request.quotes.length} proposal{request.quotes.length === 1 ? '' : 's'}</span>
                      {latest ? <b>{money(latest.totalMinor, latest.currency)}</b> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="ma-portal-detail">
            {detail.loading && !detail.data ? <PortalSkeleton rows={5} /> : null}
            {detail.error ? <PortalError error={detail.error} retry={() => void detail.reload()} /> : null}

            {detail.data && !quote ? (
              <article className="ma-portal-card">
                <div className="ma-portal-card-head">
                  <div>
                    <p className="ma-portal-kicker">Your request</p>
                    <h2>{detail.data.service?.title ?? 'Tailor-made journey'}</h2>
                  </div>
                  <StatusChip status={detail.data.status} />
                </div>
                <p className="ma-portal-prose">
                  {statusLabel(detail.data.status)}. {dateRange(detail.data.startDate, detail.data.endDate)} ·{' '}
                  {detail.data.adults} adult{detail.data.adults === 1 ? '' : 's'}
                  {detail.data.children ? ` · ${detail.data.children} child${detail.data.children === 1 ? '' : 'ren'}` : ''}.
                </p>
                <div className="ma-portal-note is-info">
                  <strong>The desk is working on your written proposal.</strong>
                  <span>We will email you the moment it is ready. No payment is needed to ask.</span>
                </div>
              </article>
            ) : null}

            {detail.data && quote ? (
              <ProposalCard
                request={detail.data}
                quote={quote}
                booking={bookingForQuote}
                onChanged={reloadAll}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}

function ProposalCard({
  request,
  quote,
  booking,
  onChanged,
}: {
  request: RequestDetail;
  quote: Quote;
  booking: BookingSummary | null;
  onChanged: () => Promise<void>;
}) {
  const startDate = quote.priceSnapshot?.startDate ?? request.startDate;
  const endDate = quote.priceSnapshot?.endDate ?? request.endDate;
  const depositPercent = Math.round((quote.policySnapshot?.depositBasisPoints ?? 3000) / 100);
  const accepted = quote.state === 'ACCEPTED';

  return (
    <article className="ma-portal-proposal" aria-labelledby={`proposal-${quote.id}`}>
      <header className="ma-portal-proposal-head">
        <div>
          <p className="ma-portal-kicker">Proposal v{quote.versionNumber} · {request.service?.title ?? 'Journey'}</p>
          <h2 id={`proposal-${quote.id}`}>{dateRange(startDate, endDate)}</h2>
          <p className="ma-portal-proposal-sub">
            Sent {dateTimeLabel(quote.sentAt) || 'by the desk'} · Expires {dateTimeLabel(quote.expiresAt)}
          </p>
        </div>
        <StatusChip status={quote.state} />
      </header>

      <div className="ma-portal-figures">
        <div>
          <small>Journey total</small>
          <strong>{money(quote.totalMinor, quote.currency)}</strong>
        </div>
        <div>
          <small>{depositPercent}% deposit to confirm</small>
          <strong>{money(quote.depositMinor, quote.currency)}</strong>
        </div>
        <div>
          <small>Travellers</small>
          <strong>
            {request.adults} adult{request.adults === 1 ? '' : 's'}
            {request.children ? ` + ${request.children} child${request.children === 1 ? '' : 'ren'}` : ''}
          </strong>
        </div>
        <div>
          <small>Quotation currency</small>
          <strong>{quote.currency}</strong>
        </div>
      </div>

      {quote.lines.length ? (
        <section className="ma-portal-block" aria-labelledby={`pricing-${quote.id}`}>
          <h3 id={`pricing-${quote.id}`}>What the price covers</h3>
          <div className="ma-portal-table-wrap">
            <table className="ma-portal-table">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <span className="ma-portal-line-category">{line.category.toLowerCase()}</span>
                      {line.description}
                    </td>
                    <td>{line.quantity}</td>
                    <td>{money(line.unitAmountMinor, quote.currency)}</td>
                    <td><b>{money(line.totalMinor, quote.currency)}</b></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3}>Total</th>
                  <td><b>{money(quote.totalMinor, quote.currency)}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ) : null}

      {quote.itinerary ? (
        <section className="ma-portal-block" aria-labelledby={`itinerary-${quote.id}`}>
          <h3 id={`itinerary-${quote.id}`}>Day by day</h3>
          <Itinerary value={quote.itinerary} />
        </section>
      ) : null}

      <section className="ma-portal-block" aria-labelledby={`policy-${quote.id}`}>
        <h3 id={`policy-${quote.id}`}>Quotation policy</h3>
        <div className="ma-portal-policy">
          <p>
            {quote.policySnapshot?.summary ??
              'Changes after acceptance are reviewed by the desk. The deposit secures your dates; the balance is due before travel.'}
          </p>
          <dl>
            <div><dt>Deposit</dt><dd>{depositPercent}% of the journey total</dd></div>
            <div><dt>Quote validity</dt><dd>Until {dateLabel(quote.expiresAt)}</dd></div>
            <div><dt>Balance</dt><dd>{quote.policySnapshot?.balanceDaysBefore ?? 7} days before travel</dd></div>
          </dl>
        </div>
      </section>

      <Decision
        request={request}
        quote={quote}
        accepted={accepted}
        booking={booking}
        onChanged={onChanged}
      />
    </article>
  );
}

type DecisionAction = 'accept' | 'revise' | 'reject' | null;

function Decision({
  request,
  quote,
  accepted,
  booking,
  onChanged,
}: {
  request: RequestDetail;
  quote: Quote;
  accepted: boolean;
  booking: BookingSummary | null;
  onChanged: () => Promise<void>;
}) {
  const { user } = usePortalAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<DecisionAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<{ id: string; reference: string } | null>(null);

  const policyId = quote.policySnapshot?.id;
  const isSent = quote.state === 'SENT';
  const emailBlocked = !user?.emailVerified;
  const resumeBooking = booking ?? (createdBooking ? { id: createdBooking.id, reference: createdBooking.reference } : null);

  async function accept() {
    if (!policyId) {
      setError('This proposal is missing its policy reference. Ask the desk to resend it.');
      return;
    }
    setPending('accept');
    setError(null);
    setNotice(null);
    try {
      const result = await portalRequest<{ bookingId: string; reference: string }>(`/quotes/${quote.id}/accept`, {
        method: 'POST',
        body: { expectedVersion: quote.version, acceptedPolicyVersionId: policyId },
      });
      setCreatedBooking({ id: result.bookingId, reference: result.reference });
      setNotice(`Journey reserved — ${result.reference}. Your deposit is the next step.`);
      await onChanged();
    } catch (failure) {
      setError(portalErrorMessage(failure));
    } finally {
      setPending(null);
    }
  }

  async function revise() {
    if (reason.trim().length < 3) {
      setError('Tell the desk what you would like to change.');
      return;
    }
    setPending('revise');
    setError(null);
    setNotice(null);
    try {
      await portalRequest(`/custom-requests/${request.id}/revision-requests`, {
        method: 'POST',
        body: { expectedVersion: request.version, reason: reason.trim() },
      });
      setReason('');
      setNotice('Your changes are with the Arusha desk. They will send a revised proposal here.');
      await onChanged();
    } catch (failure) {
      setError(portalErrorMessage(failure));
    } finally {
      setPending(null);
    }
  }

  async function reject() {
    setPending('reject');
    setError(null);
    setNotice(null);
    try {
      await portalRequest(`/quotes/${quote.id}/reject`, {
        method: 'POST',
        body: { expectedVersion: quote.version, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      });
      setNotice('Proposal declined. The desk can still prepare a different journey whenever you are ready.');
      await onChanged();
    } catch (failure) {
      setError(portalErrorMessage(failure));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="ma-portal-decision" aria-labelledby={`decision-${quote.id}`}>
      <h3 id={`decision-${quote.id}`}>{accepted ? 'Your decision' : 'Make it yours'}</h3>

      {accepted || resumeBooking ? (
        <div className="ma-portal-note is-success" role="status">
          <strong>
            Journey reserved{resumeBooking ? ` — ${resumeBooking.reference}` : ''}
          </strong>
          <span>
            {accepted && resumeBooking
              ? 'This proposal is accepted. Pay the deposit to confirm your dates.'
              : notice ?? 'This proposal is accepted.'}
          </span>
          {resumeBooking ? (
            <a className="ma-portal-btn is-primary" href={`/portal/bookings/?id=${resumeBooking.id}`}>
              Open trip &amp; pay deposit
            </a>
          ) : null}
        </div>
      ) : null}

      {notice && !accepted && !resumeBooking ? (
        <p className="ma-portal-note is-success" role="status">{notice}</p>
      ) : null}

      {isSent ? (
        <>
          {emailBlocked ? (
            <div className="ma-portal-note is-warning">
              <strong>Verify your email to continue.</strong>
              <span>Accepting a proposal and paying a deposit needs a verified email address.</span>
              <a className="ma-portal-inline-link" href={`/portal/verify/?email=${encodeURIComponent(user?.email ?? '')}`}>
                Verify my email
              </a>
            </div>
          ) : null}

          <label className={`ma-portal-check${emailBlocked ? ' is-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={emailBlocked}
            />
            <span>
              I accept this quotation and the displayed policy. I understand the {Math.round((quote.policySnapshot?.depositBasisPoints ?? 3000) / 100)}% deposit
              is needed to confirm the journey.
            </span>
          </label>

          <div className="ma-portal-decision-actions">
            <button
              className="ma-portal-btn is-primary"
              type="button"
              onClick={() => void accept()}
              disabled={!confirmed || pending !== null || emailBlocked}
            >
              {pending === 'accept' ? 'Reserving your journey…' : 'Accept & reserve'}
            </button>
            <span className="ma-portal-decision-hint">
              No card is charged yet. You choose the payment step next.
            </span>
          </div>

          <div className="ma-portal-revision">
            <label className="ma-portal-field">
              <span>Not quite right? <small>Tell us what to change</small></span>
              <textarea
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Different lodge, extra day, a tighter budget, different dates…"
              />
            </label>
            <div className="ma-portal-revision-actions">
              <button
                className="ma-portal-btn is-quiet"
                type="button"
                onClick={() => void revise()}
                disabled={pending !== null || reason.trim().length < 3}
              >
                {pending === 'revise' ? 'Sending…' : 'Request changes'}
              </button>
              <button
                className="ma-portal-textbtn"
                type="button"
                onClick={() => void reject()}
                disabled={pending !== null}
              >
                {pending === 'reject' ? 'Declining…' : 'Decline this proposal'}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {!isSent && !accepted && !resumeBooking ? (
        <p className="ma-portal-prose">
          {quote.state === 'SUPERSEDED'
            ? 'A newer version replaced this proposal. Open the latest one to continue.'
            : quote.state === 'REJECTED'
              ? 'You declined this version. The desk can prepare a fresh proposal whenever you are ready.'
              : quote.state === 'EXPIRED'
                ? 'This proposal expired. Ask the desk for an updated price and dates.'
                : 'No action is available on this version.'}
        </p>
      ) : null}

      {error ? <p className="ma-portal-note is-error" role="alert">{error}</p> : null}
    </section>
  );
}
