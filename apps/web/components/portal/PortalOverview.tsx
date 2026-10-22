'use client';

import { usePortalAuth } from '../../lib/portal/auth';
import {
  dateLabel,
  dateRange,
  daysUntil,
  money,
  statusLabel,
} from '../../lib/portal/format';
import type { BookingSummary, RequestSummary } from '../../lib/portal/api';
import { usePortalResource } from '../../lib/portal/hooks';
import { PortalEmpty, PortalError, PortalSkeleton } from './PortalBits';
import { PortalPageHead, PortalShell, StatusChip } from './PortalShell';

export default function PortalOverview() {
  const { user } = usePortalAuth();
  const requests = usePortalResource<RequestSummary[]>('/custom-requests?limit=50');
  const bookings = usePortalResource<BookingSummary[]>('/bookings?limit=50');

  const proposals = (requests.data ?? []).flatMap((request) =>
    request.quotes
      .filter((quote) => quote.state === 'SENT')
      .map((quote) => ({ request, quote })),
  );
  const upcoming = (bookings.data ?? [])
    .filter((booking) => ['REQUESTED', 'CONFIRMED'].includes(booking.status))
    .filter((booking) => (daysUntil(booking.endDate) ?? 0) >= 0)
    .sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime());
  const due = (bookings.data ?? []).filter(
    (booking) => Number(booking.paymentSummary.balanceDue) > 0 && booking.status !== 'CANCELLED',
  );
  const nextTrip = upcoming[0];
  const firstName = (user?.name ?? 'traveller').split(/\s+/)[0];
  const loading = requests.loading || bookings.loading;
  const failure = requests.error ?? bookings.error;

  return (
    <PortalShell active="overview">
      <PortalPageHead
        kicker="Your travel file"
        title={<>Karibu, <em>{firstName}.</em></>}
        intro="Proposals, confirmed trips and payments from the Arusha desk — kept in one private place."
        actions={<a className="ma-portal-btn is-quiet" href="/#destinations">Browse journeys</a>}
      />

      {loading && !requests.data && !bookings.data ? <PortalSkeleton rows={4} /> : null}
      {failure ? <PortalError error={failure} retry={() => { void requests.reload(); void bookings.reload(); }} /> : null}

      {!loading && !failure ? (
        <>
          <div className="ma-portal-metrics">
            <a className="ma-portal-metric" href="/portal/quotes/">
              <small>Proposals to review</small>
              <strong>{proposals.length}</strong>
              <span>{proposals.length ? 'Waiting for your decision' : 'Nothing waiting'}</span>
            </a>
            <a className="ma-portal-metric" href="/portal/bookings/">
              <small>Upcoming trips</small>
              <strong>{upcoming.length}</strong>
              <span>{nextTrip ? dateRange(nextTrip.startDate, nextTrip.endDate) : 'No trips booked yet'}</span>
            </a>
            <a className="ma-portal-metric" href="/portal/bookings/">
              <small>Payments due</small>
              <strong>{due.length}</strong>
              <span>
                {due.length
                  ? due.map((booking) => money(booking.paymentSummary.balanceDue, booking.currency)).join(' · ')
                  : 'Nothing outstanding'}
              </span>
            </a>
          </div>

          {proposals.length ? (
            <section className="ma-portal-section" aria-labelledby="proposalsReady">
              <div className="ma-portal-section-head">
                <h2 id="proposalsReady">Ready for your decision</h2>
                <a href="/portal/quotes/">All proposals</a>
              </div>
              <div className="ma-portal-action-grid">
                {proposals.slice(0, 2).map(({ request, quote }) => (
                  <article className="ma-portal-action-card" key={quote.id}>
                    <StatusChip status={quote.state} />
                    <h3>{request.service?.title ?? 'Tailor-made journey'}</h3>
                    <p>
                      {dateRange(request.startDate, request.endDate)} · {request.adults} adult{request.adults === 1 ? '' : 's'}
                      {request.children ? ` · ${request.children} child${request.children === 1 ? '' : 'ren'}` : ''}
                    </p>
                    <div className="ma-portal-action-foot">
                      <strong>{money(quote.totalMinor, quote.currency)}</strong>
                      <span>Expires {dateLabel(quote.expiresAt)}</span>
                    </div>
                    <a className="ma-portal-btn is-primary" href={`/portal/quotes/?request=${request.id}&id=${quote.id}`}>
                      Review proposal
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {nextTrip ? (
            <section className="ma-portal-section" aria-labelledby="nextTrip">
              <div className="ma-portal-section-head">
                <h2 id="nextTrip">Your next journey</h2>
                <a href="/portal/bookings/">All trips</a>
              </div>
              <article className="ma-portal-trip-card">
                <div>
                  <p className="ma-portal-trip-ref">{nextTrip.reference}</p>
                  <h3>{dateRange(nextTrip.startDate, nextTrip.endDate)}</h3>
                  <p>
                    {nextTrip.adults} adult{nextTrip.adults === 1 ? '' : 's'}
                    {nextTrip.children ? ` · ${nextTrip.children} child${nextTrip.children === 1 ? '' : 'ren'}` : ''}
                    {' · '}
                    {statusLabel(nextTrip.status)}
                  </p>
                </div>
                <div className="ma-portal-trip-side">
                  <span className="ma-portal-countdown">
                    {countdown(nextTrip.startDate)}
                  </span>
                  <a className="ma-portal-btn is-primary" href={`/portal/bookings/?id=${nextTrip.id}`}>
                    Open trip
                  </a>
                </div>
              </article>
            </section>
          ) : null}

          {!proposals.length && !nextTrip ? (
            <PortalEmpty
              title="Your safari starts with a conversation"
              action={<a className="ma-portal-btn is-primary" href="/contact/">Talk to the Arusha desk</a>}
            >
              Send your dates and group size. A planner replies with a written itinerary and price —
              it will appear here when it is ready.
            </PortalEmpty>
          ) : null}

          <section className="ma-portal-section" aria-labelledby="howItWorks">
            <div className="ma-portal-section-head">
              <h2 id="howItWorks">How your booking works</h2>
            </div>
            <ol className="ma-portal-steps">
              <li>
                <b>01</b>
                <strong>Read the proposal</strong>
                <span>Day-by-day plan, lodges and a clear price. Ask for changes if something is not right.</span>
              </li>
              <li>
                <b>02</b>
                <strong>Accept and reserve</strong>
                <span>Accepting creates your booking at the quoted price and policy.</span>
              </li>
              <li>
                <b>03</b>
                <strong>Pay the deposit</strong>
                <span>30% confirms the journey. The balance is due before travel, with a receipt for every payment.</span>
              </li>
            </ol>
          </section>
        </>
      ) : null}
    </PortalShell>
  );
}

function countdown(startDate: string): string {
  const days = daysUntil(startDate);
  if (days === null) return 'Dates confirmed by the desk';
  if (days === 0) return 'Departs today';
  if (days === 1) return 'Departs tomorrow';
  if (days < 0) return 'Completed';
  return `${days} days to go`;
}
