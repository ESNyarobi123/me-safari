'use client';
import { useState } from 'react';
import Icon from './Icon';
import type { Company } from '../lib/catalog';
import { whatsappHref } from '../lib/inquiries';

const seoNav: Array<[string, string]> = [
  ['Home', '/'],
  ['Experiences', '/#destinations'],
  ['Services', '/#services'],
  ['Rentals', '/#rentals'],
  ['Contact', '/contact/'],
];

/** Shared server-rendered chrome for crawlable journey and destination pages. */
export function SeoHeader({ company }: { company: Company }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="ma-top">
      <div className="ma-wrap ma-top-row">
        <a className="ma-logo" href="/" aria-label="M&A Safaris home">
          <img src="/assets/brand-logo.png" alt="Me and Adventure Safaris" width="44" height="44" />
          <span>M&amp;A<br />Safaris</span>
        </a>
        <nav className={menuOpen ? 'open' : ''} aria-label="Site sections">
          {seoNav.map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        </nav>
        <div className="ma-top-tools">
          <a className="ma-btn ma-btn-orange" href="/contact/#enquiry">Request a quote</a>
          <button className="ma-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}

export function SeoFooter({ company }: { company: Company }) {
  const whatsapp = company.whatsapp || company.phone;
  return (
    <footer className="ma-footer">
      <div className="ma-wrap">
        <div className="ma-footer-card">
          <div className="ma-seo-footer-grid">
            <div>
              <strong>{company.name}</strong>
              <p>{company.tagline || 'Your gateway to authentic Tanzania.'}</p>
            </div>
            <div>
              <small>Talk to the desk</small>
              <a href={`mailto:${encodeURIComponent(company.email)}`}>{company.email}</a>
              <a href={`tel:${company.phone.replace(/\s/g, '')}`}>{company.phone}</a>
            </div>
            <div>
              <small>Plan</small>
              <a href="/#destinations">All journeys</a>
              <a href="/contact/">Contact the desk</a>
            </div>
            <div>
              <small>Staff</small>
              <a href="/portal/">Customer sign in</a>
              <a href="/admin/">Staff login</a>
              <a href="/#rentals">Safari AI Rentals</a>
            </div>
          </div>
          <div className="ma-footer-bottom">
            <small>© {new Date().getFullYear()} {company.name}. Journeys are confirmed by the team before you travel.</small>
            <div className="ma-footer-actions">
              <a className="ma-footer-top-link" href="/">Back to home</a>
              <a className="ma-footer-top-link" href="/#contact">Talk to a human</a>
            </div>
          </div>
        </div>
      </div>
      {whatsapp ? (
        <a className="ma-wa-float" href={whatsappHref(whatsapp) ?? undefined} target="_blank" rel="noreferrer" aria-label="Chat with the M&A Safaris desk on WhatsApp">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 15.02L2 22l5.1-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.02a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.02.89.9-2.95-.2-.3a8.1 8.1 0 1 1 6.75 3.67Zm4.44-6.07c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.4-.55-.41h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" /></svg>
          <span>WhatsApp</span>
        </a>
      ) : null}
    </footer>
  );
}

export function Breadcrumbs({ trail }: { trail: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="ma-breadcrumb" aria-label="Breadcrumb">
      {trail.map((step, index) => (
        <span key={`${step.label}-${index}`}>
          {step.href ? <a href={step.href}>{step.label}</a> : <b aria-current="page">{step.label}</b>}
          {index < trail.length - 1 ? <i aria-hidden="true"><Icon name="arrow" /></i> : null}
        </span>
      ))}
    </nav>
  );
}
