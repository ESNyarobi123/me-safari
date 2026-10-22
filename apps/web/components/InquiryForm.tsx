'use client';
import { useEffect, useId, useState } from 'react';
import { captureAttribution, packageReference, submitInquiry, whatsappHref, type InquirySource } from '../lib/inquiries';

export interface InquiryFormProps {
  source?: InquirySource;
  packageSlug?: string;
  packageTitle?: string;
  serviceSlug?: string;
  heading?: string;
  intro?: string;
  submitLabel?: string;
  whatsapp?: string | null;
  onSent?: (receiptId: string) => void;
}

type State = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Accessible lead-capture form used by the package modal, the contact section
 * and the dedicated /contact page. Submits to the public (unauthenticated) API.
 */
export default function InquiryForm({
  source = 'WEBSITE',
  packageSlug,
  packageTitle,
  serviceSlug,
  heading,
  intro,
  submitLabel = 'Send enquiry',
  whatsapp,
  onSent,
}: InquiryFormProps) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const [wa, setWa] = useState<string | null>(null);
  const uid = useId().replace(/[:]/g, '');
  useEffect(() => {
    const live = captureAttribution();
    setWa(whatsapp ? whatsappHref(whatsapp, {
      packageTitle,
      reference: packageReference(packageSlug),
      utm: live.utm,
      page: `${window.location.origin}${window.location.pathname}`,
    }) : null);
  }, [whatsapp, packageTitle, packageSlug]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? '').trim();
    const adults = Number(text('adults'));
    const children = Number(text('children'));
    setState('sending');
    setError('');
    try {
      const live = captureAttribution();
      const result = await submitInquiry({
        name: text('name'),
        email: text('email'),
        phone: text('phone') || undefined,
        message: text('message'),
        travelDate: text('travelDate') || undefined,
        adults: Number.isInteger(adults) && adults > 0 ? adults : undefined,
        children: Number.isInteger(children) && children >= 0 ? children : undefined,
        packageSlug,
        serviceSlug,
        source,
        page: typeof window === 'undefined' ? undefined : window.location.pathname.slice(0, 300),
        locale: 'en',
        landingPath: live.landingPath,
        utm: Object.keys(live.utm).length ? live.utm : undefined,
        consent: true,
        companyWebsite: text('companyWebsite') || undefined,
      });
      setReceipt(result.id);
      setState('sent');
      form.reset();
      onSent?.(result.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not send your enquiry. Please try again.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="ma-form-success" role="status" aria-live="polite">
        <strong>Asante! Your enquiry is with the Tanzania desk.</strong>
        <p>
          We reply within one working day with a personal itinerary and a clear price. Reference
          <b> {receipt.slice(0, 8).toUpperCase()}</b>{packageTitle ? ` for ${packageTitle}` : ''}.
        </p>
        <div className="ma-form-actions">
          {wa ? <a className="ma-wa-btn" href={wa} target="_blank" rel="noreferrer">Chat on WhatsApp now</a> : null}
          <button type="button" className="ma-text-btn" onClick={() => { setState('idle'); setReceipt(''); }}>Send another enquiry</button>
        </div>
      </div>
    );
  }

  return (
    <form className="ma-form" onSubmit={onSubmit}>
      {heading ? <h3 className="ma-form-heading">{heading}</h3> : null}
      {intro ? <p className="ma-form-intro">{intro}</p> : null}
      <div className="ma-form-grid">
        <label className="ma-field" htmlFor={`${uid}-name`}>
          <span>Your name *</span>
          <input id={`${uid}-name`} name="name" type="text" autoComplete="name" required minLength={2} maxLength={120} placeholder="e.g. Alice Morgan" />
        </label>
        <label className="ma-field" htmlFor={`${uid}-email`}>
          <span>Email *</span>
          <input id={`${uid}-email`} name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
        </label>
        <label className="ma-field" htmlFor={`${uid}-phone`}>
          <span>Phone / WhatsApp</span>
          <input id={`${uid}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="+255 682 886 259" />
        </label>
        <label className="ma-field" htmlFor={`${uid}-date`}>
          <span>Travel date</span>
          <input id={`${uid}-date`} name="travelDate" type="date" />
        </label>
        <label className="ma-field" htmlFor={`${uid}-adults`}>
          <span>Adults</span>
          <select id={`${uid}-adults`} name="adults" defaultValue="2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="ma-field" htmlFor={`${uid}-children`}>
          <span>Children</span>
          <select id={`${uid}-children`} name="children" defaultValue="0">
            {[0, 1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <label className="ma-field" htmlFor={`${uid}-message`}>
        <span>Tell us about your trip *</span>
        <textarea
          id={`${uid}-message`}
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          placeholder={packageTitle ? `Questions about ${packageTitle} — dates, lodges, group size, budget…` : 'Where would you like to go, when, and with how many travellers?'}
        />
      </label>
      <label className="ma-consent" htmlFor={`${uid}-consent`}>
        <input id={`${uid}-consent`} name="consent" type="checkbox" required />
        <span>I agree to be contacted about this enquiry. Your details stay with the M&amp;A Safaris desk.</span>
      </label>
      {/* Honeypot: hidden from people, filled by bots. */}
      <label className="ma-hp" aria-hidden="true">
        <span>Company website</span>
        <input name="companyWebsite" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="ma-form-actions">
        <button className="ma-btn ma-btn-orange" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : submitLabel}
        </button>
        {wa ? <a className="ma-wa-btn" href={wa} target="_blank" rel="noreferrer">Or WhatsApp us</a> : null}
      </div>
      <p className={state === 'error' ? 'ma-form-status error' : 'ma-form-status'} role="status" aria-live="polite">
        {state === 'error' ? error : 'No deposit needed to ask. Final prices are confirmed in writing by the desk.'}
      </p>
    </form>
  );
}
