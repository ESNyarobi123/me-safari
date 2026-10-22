'use client';

import { useEffect, useState } from 'react';
import {
  PortalApiError,
  downloadDocument,
  portalRequest,
  saveBlob,
  type BookingDetail,
  type BookingSummary,
  type PaymentIntent,
  type PaymentIntentRow,
  type PortalDocument,
  type Quote,
} from '../../lib/portal/api';
import { portalErrorMessage } from '../../lib/portal/auth';
import {
  dateLabel,
  dateRange,
  daysUntil,
  money,
  statusLabel,
} from '../../lib/portal/format';
import { readQueryParam, usePortalResource } from '../../lib/portal/hooks';
import { Itinerary, PortalEmpty, PortalError, PortalSkeleton } from './PortalBits';
import { PortalPageHead, PortalShell, StatusChip } from './PortalShell';

export default function PortalBookings() {
  const bookings = usePortalResource<BookingSummary[]>('/bookings?limit=50');
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    setBookingId(readQueryParam('id'));
  }, []);

  useEffect(() => {
    const list = bookings.data;
    if (!list?.length) return;
    setBookingId((current) => {
      if (current && list.some((booking) => booking.id === current)) return current;
      const actionNeeded = list.find(
        (booking) => Number(booking.paymentSummary.balanceDue) > 0 && ['REQUESTED', 'CONFIRMED'].includes(booking.status),
      );
      return (actionNeeded ?? list[0]).id;
    });
  }, [bookings.data]);

  const detail = usePortalResource<BookingDetail>(bookingId ? `/bookings/${bookingId}` : null);
  const quote = usePortalResource<Quote>(detail.data?.quoteId ? `/quotes/${detail.data.quoteId}` : null);
  const documents = usePortalResource<PortalDocument[]>(bookingId ? `/bookings/${bookingId}/documents` : null);
  const payments = usePortalResource<PaymentIntentRow[]>('/me/payments?limit=50');
  const itinerary = detail.data?.itinerary ?? quote.data?.itinerary ?? null;

  useEffect(() => {
    if (!bookingId || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('id', bookingId);
    window.history.replaceState(null, '', url);
  }, [bookingId]);

  async function reloadAll() {
    await Promise.all([detail.reload(), quote.reload(), documents.reload(), payments.reload(), bookings.reload()]);
  }

  return (
    <PortalShell active="bookings">
      <PortalPageHead
        kicker="My trips"
        title={<>The journey <em>on the road.</em></>}
        intro="Your confirmed itinerary, payments and travel documents. Every payment is verified by the server before it shows as received."
        actions={<a className="ma-portal-btn is-quiet" href="/contact/">Talk to the desk</a>}
      />

      {bookings.loading && !bookings.data ? <PortalSkeleton rows={4} /> : null}
      {bookings.error ? <PortalError error={bookings.error} retry={() => void bookings.reload()} /> : null}

      {!bookings.loading && !bookings.error && !(bookings.data ?? []).length ? (
        <PortalEmpty
          title="No trips yet"
          action={<a className="ma-portal-btn is-primary" href="/portal/quotes/">Review your proposals</a>}
        >
          When you accept a proposal, the trip and its payment plan appear here.
        </PortalEmpty>
      ) : null}

      {(bookings.data ?? []).length ? (
        <div className="ma-portal-split">
          <aside className="ma-portal-side" aria-label="Your trips">
            <p className="ma-portal-side-title">Your trips</p>
            <div className="ma-portal-side-list" role="list">
              {(bookings.data ?? []).map((booking) => {
                const selectedRow = booking.id === bookingId;
                const due = Number(booking.paymentSummary.balanceDue);
                return (
                  <button
                    key={booking.id}
                    type="button"
                    role="listitem"
                    className={`ma-portal-side-item${selectedRow ? ' is-active' : ''}`}
                    aria-current={selectedRow ? 'true' : undefined}
                    onClick={() => setBookingId(booking.id)}
                  >
                    <span className="ma-portal-side-top">
                      <strong>{booking.reference}</strong>
                      <StatusChip status={booking.status} />
                    </span>
                    <span className="ma-portal-side-meta">{dateRange(booking.startDate, booking.endDate)}</span>
                    <span className="ma-portal-side-foot">
                      <span>{statusLabel(booking.paymentSummary.status)}</span>
                      {due > 0 ? <b className="is-due">{money(booking.paymentSummary.balanceDue, booking.currency)} due</b> : <b>Paid</b>}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="ma-portal-detail">
            {detail.loading && !detail.data ? <PortalSkeleton rows={5} /> : null}
            {detail.error ? <PortalError error={detail.error} retry={() => void detail.reload()} /> : null}

            {detail.data ? (
              <>
                <article className="ma-portal-trip" aria-labelledby={`trip-${detail.data.id}`}>
                  <header className="ma-portal-trip-head">
                    <div>
                      <p className="ma-portal-kicker">Trip {detail.data.reference}</p>
                      <h2 id={`trip-${detail.data.id}`}>{dateRange(detail.data.startDate, detail.data.endDate)}</h2>
                      <p className="ma-portal-proposal-sub">
                        {detail.data.adults} adult{detail.data.adults === 1 ? '' : 's'}
                        {detail.data.children ? ` · ${detail.data.children} child${detail.data.children === 1 ? '' : 'ren'}` : ''}
                        {detail.data.timezone ? ` · ${detail.data.timezone.split('/').pop()?.replaceAll('_', ' ')}` : ''}
                      </p>
                    </div>
                    <div className="ma-portal-trip-state">
                      <StatusChip status={detail.data.status} />
                      <span>{tripCountdown(detail.data.startDate)}</span>
                    </div>
                  </header>

                  <div className="ma-portal-figures">
                    <div>
                      <small>Journey total</small>
                      <strong>{money(detail.data.paymentSummary.contractTotal, detail.data.currency)}</strong>
                    </div>
                    <div>
                      <small>Paid so far</small>
                      <strong>{money(detail.data.paymentSummary.netPaid, detail.data.currency)}</strong>
                    </div>
                    <div>
                      <small>Balance due</small>
                      <strong className={Number(detail.data.paymentSummary.balanceDue) > 0 ? 'is-due' : undefined}>
                        {money(detail.data.paymentSummary.balanceDue, detail.data.currency)}
                      </strong>
                    </div>
                    <div>
                      <small>Deposit to confirm</small>
                      <strong>{money(detail.data.paymentSummary.depositDue, detail.data.currency)}</strong>
                    </div>
                  </div>

                  {itinerary ? (
                    <section className="ma-portal-block" aria-labelledby="tripItinerary">
                      <h3 id="tripItinerary">Your itinerary</h3>
                      <Itinerary value={itinerary} />
                      {!detail.data.itinerary && quote.data ? (
                        <p className="ma-portal-fineprint">
                          As quoted. The desk publishes your final travel itinerary before departure.
                        </p>
                      ) : null}
                    </section>
                  ) : null}

                  <PaymentPanel booking={detail.data} onPaid={reloadAll} />

                  <div className="ma-portal-trip-grid">
                    <section className="ma-portal-block" aria-labelledby="tripTravelers">
                      <h3 id="tripTravelers">Travellers</h3>
                      {detail.data.travelers?.length ? (
                        <ul className="ma-portal-travellers">
                          {detail.data.travelers.map((traveler) => (
                            <li key={traveler.id}>
                              <span className="ma-portal-avatar is-small" aria-hidden="true">
                                {traveler.fullName.slice(0, 1).toUpperCase()}
                              </span>
                              <span>
                                <strong>{traveler.fullName}</strong>
                                <small>
                                  {traveler.band === 'CHILD' ? 'Child' : 'Adult'}
                                  {traveler.isLead ? ' · Lead traveller' : ''}
                                </small>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="ma-portal-prose">Traveller names are confirmed with the desk before departure.</p>
                      )}
                    </section>

                    <section className="ma-portal-block" aria-labelledby="tripPickup">
                      <h3 id="tripPickup">Pickup</h3>
                      {detail.data.pickup?.label || detail.data.pickup?.address ? (
                        <p className="ma-portal-prose">
                          <strong>{detail.data.pickup?.label ?? 'Pickup point'}</strong>
                          {detail.data.pickup?.address ? <><br />{detail.data.pickup.address}</> : null}
                        </p>
                      ) : (
                        <p className="ma-portal-prose">The desk will confirm your pickup time and place before travel.</p>
                      )}
                    </section>
                  </div>
                </article>

                <PaymentHistory
                  rows={(payments.data ?? []).filter((row) => row.bookingId === detail.data?.id)}
                  currency={detail.data.currency}
                  loading={payments.loading}
                />

                <Documents
                  documents={documents.data ?? []}
                  loading={documents.loading}
                  error={documents.error}
                  onRefresh={() => void documents.reload()}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}

function tripCountdown(startDate: string): string {
  const days = daysUntil(startDate);
  if (days === null) return 'Dates confirmed by the desk';
  if (days === 0) return 'Departs today';
  if (days === 1) return 'Departs tomorrow';
  if (days < 0) return 'Journey completed';
  return `${days} days until departure`;
}

type PaymentPurpose = 'DEPOSIT' | 'FULL' | 'BALANCE';

function PaymentPanel({ booking, onPaid }: { booking: BookingDetail; onPaid: () => Promise<void> }) {
  const summary = booking.paymentSummary;
  const depositDue = Number(summary.depositDue);
  const balanceDue = Number(summary.balanceDue);
  const payable = balanceDue > 0 && ['REQUESTED', 'CONFIRMED'].includes(booking.status);
  const [purpose, setPurpose] = useState<PaymentPurpose>(depositDue > 0 ? 'DEPOSIT' : 'BALANCE');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [pending, setPending] = useState<'create' | 'simulate' | 'check' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!intent || !['PENDING', 'PROCESSING', 'UNKNOWN'].includes(intent.status)) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void portalRequest<PaymentIntent>(`/payment-intents/${intent.id}`)
        .then((next) => {
          if (!cancelled) setIntent(next);
        })
        .catch(() => {
          /* keep the last known state; the traveller can check manually */
        });
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [intent]);

  const options: Array<{ value: PaymentPurpose; label: string }> = [];
  if (depositDue > 0) options.push({ value: 'DEPOSIT', label: `Deposit · ${money(summary.depositDue, booking.currency)}` });
  if (balanceDue > 0) options.push({ value: 'BALANCE', label: `Balance · ${money(summary.balanceDue, booking.currency)}` });
  if (balanceDue > 0) options.push({ value: 'FULL', label: `Full outstanding · ${money(summary.balanceDue, booking.currency)}` });

  async function start() {
    setPending('create');
    setError(null);
    setNotice(null);
    try {
      const created = await portalRequest<PaymentIntent>(`/bookings/${booking.id}/payment-intents`, {
        method: 'POST',
        body: { purpose, returnPath: '/portal/bookings' },
      });
      setIntent(created);
    } catch (failure) {
      if (failure instanceof PortalApiError && failure.code === 'PAYMENT_ALREADY_PENDING') {
        const existing = failure.details.intentId;
        if (typeof existing === 'string') {
          try {
            setIntent(await portalRequest<PaymentIntent>(`/payment-intents/${existing}`));
            setNotice('A payment is already awaiting verification. You can continue it below.');
            return;
          } catch {
            /* fall through to the message */
          }
        }
      }
      setError(portalErrorMessage(failure));
    } finally {
      setPending(null);
    }
  }

  async function simulate(scenario: 'SUCCESS' | 'FAILURE') {
    if (!intent) return;
    setPending('simulate');
    setError(null);
    setNotice(null);
    try {
      await portalRequest(`/dev/payment-intents/${intent.id}/simulate`, {
        method: 'POST',
        body: { scenario },
      });
      const next = await portalRequest<PaymentIntent>(`/payment-intents/${intent.id}`);
      setIntent(next);
      if (next.status === 'CAPTURED' || next.status === 'SUCCEEDED') {
        setNotice(null);
        await onPaid();
      } else if (next.status === 'FAILED' || next.status === 'EXPIRED') {
        setNotice('The provider declined this attempt. No money moved — you can try again.');
      } else {
        setNotice('The provider is still processing. Check the status in a moment.');
      }
    } catch (failure) {
      setError(portalErrorMessage(failure));
    } finally {
      setPending(null);
    }
  }

  async function check() {
    if (!intent) return;
    setPending('check');
    setError(null);
    try {
      const next = await portalRequest<PaymentIntent>(`/payment-intents/${intent.id}`);
      setIntent(next);
      if (next.status === 'CAPTURED' || next.status === 'SUCCEEDED') {
        setNotice(null);
        await onPaid();
      }
    } catch (failure) {
      setError(portalErrorMessage(failure));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="ma-portal-payment" aria-labelledby="paymentTitle">
      <div className="ma-portal-payment-head">
        <div>
          <h3 id="paymentTitle">Payments</h3>
          <p>
            {payable
              ? `${money(summary.balanceDue, booking.currency)} still due on this journey.`
              : summary.status === 'PAID'
                ? 'This journey is paid in full.'
                : 'The desk will open the payment step when it is time.'}
          </p>
        </div>
        <StatusChip status={summary.status} />
      </div>

      {payable && !intent ? (
        <>
          {options.length > 1 ? (
            <div className="ma-portal-purpose" role="radiogroup" aria-label="Payment amount">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={purpose === option.value}
                  className={purpose === option.value ? 'is-active' : undefined}
                  onClick={() => setPurpose(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          <button className="ma-portal-btn is-primary" type="button" onClick={() => void start()} disabled={pending !== null}>
            {pending === 'create'
              ? 'Opening secure checkout…'
              : `Pay ${money(purpose === 'DEPOSIT' ? summary.depositDue : summary.balanceDue, booking.currency)}`}
          </button>
          <p className="ma-portal-fineprint">
            Mobile-money payment is provided by Snippe. Amounts are verified by the server before a
            receipt is issued.
          </p>
        </>
      ) : null}

      {intent ? (
        <div className="ma-portal-checkout">
          <div className="ma-portal-checkout-head">
            <div>
              <small>{intent.provider === 'mock' ? 'Development checkout' : 'Secure checkout'}</small>
              <strong>{money(intent.amount.minor, intent.amount.currency)}</strong>
              <span>{purposeLabel(intent.purpose)} · Ref {intent.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <StatusChip status={intent.status} />
          </div>

          {intent.provider === 'mock' ? (
            <p className="ma-portal-note is-warning">
              <strong>Development payment — no real money moves.</strong>
              <span>Choose a simulated outcome to exercise the verified payment flow.</span>
            </p>
          ) : null}

          {intent.provider === 'snippe' && ['PENDING', 'PROCESSING', 'UNKNOWN'].includes(intent.status) ? (
            <p className="ma-portal-note" role="status">
              <strong>Check your phone.</strong>
              <span>
                {typeof intent.nextAction?.instructions === 'string'
                  ? intent.nextAction.instructions
                  : 'Approve the mobile-money prompt on your phone, then check the status here.'}
              </span>
            </p>
          ) : null}

          {['CAPTURED', 'SUCCEEDED'].includes(intent.status) ? (
            <p className="ma-portal-note is-success" role="status">
              <strong>Payment received.</strong>
              <span>A receipt is being prepared below; the desk has been notified.</span>
            </p>
          ) : null}

          {intent.provider === 'mock' && ['PENDING', 'PROCESSING', 'UNKNOWN'].includes(intent.status) ? (
            <div className="ma-portal-checkout-actions">
              <button className="ma-portal-btn is-primary" type="button" onClick={() => void simulate('SUCCESS')} disabled={pending !== null}>
                {pending === 'simulate' ? 'Confirming…' : 'Simulate successful payment'}
              </button>
              <button className="ma-portal-btn is-quiet" type="button" onClick={() => void simulate('FAILURE')} disabled={pending !== null}>
                Simulate failure
              </button>
            </div>
          ) : null}

          <div className="ma-portal-checkout-actions">
            <button className="ma-portal-btn is-quiet" type="button" onClick={() => void check()} disabled={pending !== null}>
              {pending === 'check' ? 'Checking…' : 'Check status'}
            </button>
            {['FAILED', 'EXPIRED'].includes(intent.status) ? (
              <button className="ma-portal-btn is-quiet" type="button" onClick={() => { setIntent(null); setNotice(null); }}>
                Try another payment
              </button>
            ) : null}
            {['PENDING', 'PROCESSING', 'UNKNOWN'].includes(intent.status) ? (
              <span className="ma-portal-checkout-note">
                Pending payments are checked automatically every few seconds.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {notice ? <p className="ma-portal-note is-success" role="status">{notice}</p> : null}
      {error ? <p className="ma-portal-note is-error" role="alert">{error}</p> : null}
    </section>
  );
}

function purposeLabel(purpose: string): string {
  if (purpose === 'DEPOSIT') return 'Deposit';
  if (purpose === 'FULL') return 'Full outstanding balance';
  return 'Balance';
}

function PaymentHistory({
  rows,
  currency,
  loading,
}: {
  rows: PaymentIntentRow[];
  currency: string;
  loading: boolean;
}) {
  return (
    <section className="ma-portal-block" aria-labelledby="paymentHistory">
      <h3 id="paymentHistory">Payment history</h3>
      {loading && !rows.length ? <PortalSkeleton rows={2} /> : null}
      {!loading && !rows.length ? (
        <p className="ma-portal-prose">No payments have been started on this trip yet.</p>
      ) : null}
      {rows.length ? (
        <ul className="ma-portal-payments">
          {rows.map((row) => {
            const posting = row.postings?.[0];
            return (
              <li key={row.id}>
                <span>
                  <strong>{purposeLabel(row.purpose)}</strong>
                  <small>
                    {dateLabel(posting?.settledAt ?? row.createdAt)} · {row.provider === 'mock' ? 'Development provider' : row.provider === 'snippe' ? 'Snippe mobile money' : row.provider}
                  </small>
                </span>
                <span className="ma-portal-payment-amount">
                  {money(posting?.amountMinor ?? row.amountMinor, posting?.currency ?? row.currency ?? currency)}
                  <StatusChip status={posting ? 'CAPTURED' : row.state} />
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function Documents({
  documents,
  loading,
  error,
  onRefresh,
}: {
  documents: PortalDocument[];
  loading: boolean;
  error: PortalApiError | null;
  onRefresh: () => void;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function download(document: PortalDocument) {
    setDownloading(document.id);
    setFailure(null);
    try {
      const file = await downloadDocument(document.id);
      saveBlob(file.blob, file.filename);
    } catch (downloadError) {
      setFailure(
        downloadError instanceof PortalApiError
          ? portalErrorMessage(downloadError)
          : 'The document could not be downloaded yet.',
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <section className="ma-portal-block" aria-labelledby="tripDocuments">
      <div className="ma-portal-block-head">
        <h3 id="tripDocuments">Documents &amp; receipts</h3>
        <button className="ma-portal-textbtn" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      {error ? <PortalError error={error} retry={onRefresh} /> : null}
      {loading && !documents.length ? <PortalSkeleton rows={2} /> : null}
      {!loading && !documents.length ? (
        <p className="ma-portal-prose">
          Receipts appear here after a verified payment. Itinerary PDFs are added when the desk publishes them.
        </p>
      ) : null}
      {documents.length ? (
        <ul className="ma-portal-documents">
          {documents.map((document) => (
            <li key={document.id}>
              <span>
                <strong>{documentLabel(document.type)}</strong>
                <small>
                  {dateLabel(document.createdAt)} · {statusLabel(document.status)}
                </small>
              </span>
              {document.status === 'READY' ? (
                <button
                  className="ma-portal-btn is-quiet"
                  type="button"
                  onClick={() => void download(document)}
                  disabled={downloading === document.id}
                >
                  {downloading === document.id ? 'Preparing…' : 'Download'}
                </button>
              ) : (
                <span className="ma-portal-doc-state">{statusLabel(document.status)}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {failure ? <p className="ma-portal-note is-error" role="alert">{failure}</p> : null}
    </section>
  );
}

function documentLabel(type: string): string {
  if (type === 'RECEIPT') return 'Payment receipt';
  if (type === 'ITINERARY') return 'Final itinerary';
  if (type === 'QUOTE') return 'Quotation PDF';
  return type.replaceAll('_', ' ').toLowerCase().replace(/^./, (char) => char.toUpperCase());
}
