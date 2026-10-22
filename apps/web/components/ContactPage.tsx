'use client';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import InquiryForm from './InquiryForm';
import { type Company, companyFallback } from '../lib/catalog';
import { API_BASE, whatsappHref } from '../lib/inquiries';

const contactNav = [
  ['Home', '/'],
  ['Experiences', '/#destinations'],
  ['Services', '/#services'],
  ['Rentals', '/#rentals'],
];

async function publicCompany(signal?: AbortSignal): Promise<Company | null> {
  try {
    const response = await fetch(`${API_BASE}/public/company`, { credentials: 'omit', signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const data = body && typeof body === 'object' && 'data' in body ? (body as { data?: unknown }).data : null;
    return data && typeof data === 'object' ? { ...companyFallback, ...(data as Company) } : null;
  } catch { return null; }
}

/** Dedicated /contact page: the human, accountable entry point into the safari desk. */
export default function ContactPage() {
  const [company, setCompany] = useState<Company>(companyFallback);
  useEffect(() => {
    const controller = new AbortController();
    void publicCompany(controller.signal).then((live) => { if (live) setCompany(live); });
    return () => controller.abort();
  }, []);
  const whatsapp = company.whatsapp || company.phone;
  const wa = whatsappHref(whatsapp);

  return (
    <div className="ma ma-contact-page">
      <header className="ma-top">
        <div className="ma-wrap ma-top-row">
          <a className="ma-logo" href="/" aria-label="M&A Safaris home">
            <img src="/assets/brand-logo.png" alt="Me and Adventure Safaris" width="44" height="44" />
            <span>M&amp;A<br />Safaris</span>
          </a>
          <nav aria-label="Page sections">
            {contactNav.map(([label, href]) => <a key={label} href={href}>{label}</a>)}
            <a href="/contact/" className="active" aria-current="page">Contact</a>
          </nav>
          <div className="ma-top-tools">
            <a className="ma-btn ma-btn-orange" href="/#destinations">Explore journeys</a>
          </div>
        </div>
      </header>

      <main className="ma-wrap ma-contact-page-main">
        <section className="ma-contact-page-hero" aria-labelledby="contactPageTitle">
          <p className="ma-badge ma-exp-badge">
            <span>Contact · Arusha &amp; across Tanzania</span>
            <span className="ma-badge-dot" aria-hidden="true"><Icon name="map-pin" /></span>
          </p>
          <h1 id="contactPageTitle" className="ma-two-tone">Speak to a human <em>who lives here.</em></h1>
          <p>
            No call centres and no bots. Your enquiry reaches the same local planners who quote, confirm and run the trip —
            usually within one working day. Write to us, WhatsApp us, or ask for a written itinerary below.
          </p>
        </section>

        <section className="ma-contact-form-band" id="enquiry" aria-label="Request a safari quote">
          <div className="ma-contact-form-copy">
            <h2 className="ma-two-tone">Plan your trip, <em>at your pace.</em></h2>
            <p>
              Tell us when you want to travel, how many people are coming and what matters most. We answer with lodge options,
              a day-by-day route and a clear price in your currency.
            </p>
            <ul className="ma-trust-points">
              <li><i aria-hidden="true">✓</i> Reply within one working day</li>
              <li><i aria-hidden="true">✓</i> 30% deposit, balance 7 days before travel</li>
              <li><i aria-hidden="true">✓</i> Tanzanian-owned, {company.offices?.length || 4} offices</li>
              <li><i aria-hidden="true">✓</i> Custom and private journeys welcome</li>
            </ul>
            <div className="ma-contact">
              <a className="ma-contact-card" href={`mailto:${encodeURIComponent(company.email)}`}>
                <span className="ma-contact-ico" aria-hidden="true"><Icon name="sparkles" /></span>
                <span className="ma-contact-meta"><small>Email the safari desk</small><strong>{company.email}</strong></span>
                <b className="ma-contact-arr" aria-hidden="true"><Icon name="arrow" /></b>
              </a>
              <a className="ma-contact-card" href={`tel:${company.phone.replace(/\s/g, '')}`}>
                <span className="ma-contact-ico" aria-hidden="true"><Icon name="compass" /></span>
                <span className="ma-contact-meta"><small>Direct phone line</small><strong>{company.phone}</strong></span>
                <b className="ma-contact-arr" aria-hidden="true"><Icon name="arrow" /></b>
              </a>
              {wa ? (
                <a className="ma-contact-card ma-contact-wa" href={wa} target="_blank" rel="noreferrer">
                  <span className="ma-contact-ico" aria-hidden="true"><Icon name="heart" /></span>
                  <span className="ma-contact-meta"><small>Instant chat · {whatsapp}</small><strong>WhatsApp</strong></span>
                  <b className="ma-contact-arr" aria-hidden="true"><Icon name="arrow" /></b>
                </a>
              ) : null}
              {company.instagram ? (
                <a className="ma-contact-card" href={`https://instagram.com/${company.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer">
                  <span className="ma-contact-ico" aria-hidden="true"><Icon name="sun" /></span>
                  <span className="ma-contact-meta"><small>Follow field stories</small><strong>{company.instagram}</strong></span>
                  <b className="ma-contact-arr" aria-hidden="true"><Icon name="arrow" /></b>
                </a>
              ) : null}
            </div>
          </div>
          <div className="ma-contact-form-card">
            <InquiryForm
              source="WEBSITE_CONTACT"
              whatsapp={whatsapp}
              heading="Request a safari quote"
              intro="Fields marked * are required. Your details stay with the M&A Safaris desk."
              submitLabel="Request my quote"
            />
          </div>
        </section>

        {company.offices?.length ? (
          <section className="ma-offices-block" aria-label="Regional offices">
            <div className="ma-offices-head">
              <span className="ma-values-label">Our Regional Offices · Walk-in &amp; Operations</span>
              <span className="ma-exp-count">{company.offices.length} branches across Tanzania</span>
            </div>
            <div className="ma-offices">
              {company.offices.map((office, idx) => (
                <article key={office.label || idx} className="ma-office-card">
                  <div className="ma-office-top">
                    <span className="ma-office-ico" aria-hidden="true"><Icon name={idx === 3 ? 'car' : 'map-pin'} /></span>
                    <span className="ma-office-num" aria-hidden="true">0{idx + 1}</span>
                  </div>
                  <strong>{office.label}</strong>
                  <p>{[office.city, office.address].filter(Boolean).join(' · ')}</p>
                  {office.phone ? (
                    <div className="ma-office-foot">
                      <a href={`tel:${office.phone.replace(/\s/g, '')}`}><span>{office.phone}</span><b aria-hidden="true"><Icon name="arrow" /></b></a>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="ma-footer">
        <div className="ma-wrap">
          <div className="ma-footer-card">
            <div className="ma-footer-bottom">
              <small>© {new Date().getFullYear()} {company.name}. Journeys are confirmed by the team before you travel.</small>
              <div className="ma-footer-actions">
                <a className="ma-footer-top-link" href="/">Back to home</a>
                <a className="ma-footer-top-link" href="/admin/">Staff login</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {wa ? (
        <a className="ma-wa-float" href={wa} target="_blank" rel="noreferrer" aria-label="Chat with the M&A Safaris desk on WhatsApp">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 15.02L2 22l5.1-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.02a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.02.89.9-2.95-.2-.3a8.1 8.1 0 1 1 6.75 3.67Zm4.44-6.07c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.4-.55-.41h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" /></svg>
          <span>WhatsApp</span>
        </a>
      ) : null}
    </div>
  );
}
