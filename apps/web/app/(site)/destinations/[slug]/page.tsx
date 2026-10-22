import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Icon from '../../../../components/Icon';
import InquiryForm from '../../../../components/InquiryForm';
import { Breadcrumbs, SeoFooter, SeoHeader } from '../../../../components/SeoChrome';
import { formatFrom, imageUrl } from '../../../../lib/catalog';
import { whatsappHref } from '../../../../lib/inquiries';
import {
  absoluteUrl, destinationBySlug, destinationPath, packagePath, seoCatalog, socialImage,
} from '../../../../lib/seo-catalog';

type Params = { slug: string };

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Params[]> {
  const { destinations } = await seoCatalog();
  return destinations.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const place = await destinationBySlug(slug);
  if (!place) return { title: 'Destination not found — M&A Safaris' };
  const url = absoluteUrl(destinationPath(place.slug));
  const description = `${place.title} — ${place.description}`.replace(/\s+/g, ' ').slice(0, 158);
  const image = socialImage(place);
  return {
    title: `${place.title} safaris & journeys | M&A Safaris`,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', title: `${place.title} — M&A Safaris`, description, url, siteName: 'M&A Safaris', images: [{ url: image, alt: place.title }] },
    twitter: { card: 'summary_large_image', title: place.title, description, images: [image] },
  };
}

export default async function DestinationPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const place = await destinationBySlug(slug);
  if (!place) notFound();

  const { company } = await seoCatalog();
  const whatsapp = company.whatsapp || company.phone;
  const url = absoluteUrl(destinationPath(place.slug));
  const image = socialImage(place);
  const journeys = place.packages ?? [];
  const wa = whatsappHref(whatsapp, { packageTitle: `${place.title} journey` });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TouristDestination',
        name: place.title,
        description: place.description,
        url,
        image,
        touristType: 'Safari travellers',
        address: { '@type': 'PostalAddress', addressCountry: 'TZ', addressRegion: place.region },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Destinations', item: absoluteUrl('/#destinations') },
          { '@type': 'ListItem', position: 3, name: place.title, item: url },
        ],
      },
    ],
  };

  return (
    <div className="ma ma-seo-page">
      <SeoHeader company={company} />

      <main className="ma-wrap ma-seo-main">
        <Breadcrumbs trail={[
          { label: 'Home', href: '/' },
          { label: 'Destinations', href: '/#destinations' },
          { label: place.title },
        ]} />

        <section className="ma-seo-hero ma-seo-hero-place" aria-labelledby="placeTitle">
          <div className="ma-seo-hero-copy">
            <p className="ma-badge ma-exp-badge">
              <span>{place.region || 'Tanzania'}</span>
              <span className="ma-badge-dot" aria-hidden="true"><Icon name="map-pin" /></span>
            </p>
            <h1 id="placeTitle" className="ma-two-tone">{place.title}</h1>
            <p className="ma-seo-lead">{place.description}</p>
            <div className="ma-seo-actions">
              <a className="ma-btn ma-btn-orange" href="#enquiry">Plan this destination</a>
              {wa ? <a className="ma-wa-btn" href={wa} target="_blank" rel="noreferrer">Ask on WhatsApp</a> : null}
            </div>
            <p className="ma-seo-note">
              We design every route around your dates, your pace and the animals or landscapes you came to see.
              Nothing on this page is a fixed bus tour.
            </p>
          </div>
          <div className="ma-seo-hero-media">
            <img src={imageUrl(place)} alt={`${place.title} — Tanzania`} width={960} height={720} />
          </div>
        </section>

        {journeys.length ? (
          <section className="ma-seo-related" aria-labelledby="placeJourneys">
            <div className="ma-seo-related-head">
              <h2 id="placeJourneys" className="ma-two-tone">Journeys in <em>{place.title}.</em></h2>
              <span className="ma-exp-count">{journeys.length} published</span>
            </div>
            <div className="ma-seo-related-grid">
              {journeys.map((entry) => (
                <a className="ma-seo-card" key={entry.id} href={packagePath(entry.slug)}>
                  <img src={imageUrl(entry)} alt="" width={480} height={300} loading="lazy" />
                  <span className="ma-seo-card-body">
                    <small>{entry.durationDays} days · {entry.category}</small>
                    <strong>{entry.title}</strong>
                    <span>{entry.description}</span>
                    <em>{formatFrom(entry)}</em>
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="ma-seo-split" aria-label="Planning notes">
          <div>
            <h2 className="ma-two-tone">What a <em>{place.title}</em> trip looks like.</h2>
            <p className="ma-seo-body">
              Start with the journey above, or tell us what you want to see and we will build the route around it.
              The desk in Arusha plans driving times, park entries, lodge availability and the right guide for the season.
            </p>
            <ul className="ma-seo-list ma-seo-list-check">
              <li>Private vehicle and a local guide, not a shared coach.</li>
              <li>Season-aware routing — migration, calving, crowds and rainfall.</li>
              <li>Lodge and camp options across comfort levels, quoted in your currency.</li>
              <li>Airport transfers and Safari AI Rentals available from the same desk.</li>
            </ul>
          </div>
          <aside className="ma-seo-aside">
            <div className="ma-seo-panel">
              <h3>Why book direct</h3>
              <p>
                You speak to the same Tanzanian team that runs the trip. No marketplace middleman, no surprise transfer fees.
              </p>
              <a className="ma-story-cta" href="/contact/">
                <span>Meet the desk</span>
                <b aria-hidden="true"><Icon name="arrow" /></b>
              </a>
            </div>
            <div className="ma-seo-panel ma-seo-panel-muted">
              <h3>Safari AI Rentals</h3>
              <p>Chauffeur-driven 4×4s and airport transfers across Tanzania, booked with the same team.</p>
              <a className="ma-story-cta" href="/#rentals">
                <span>See the fleet</span>
                <b aria-hidden="true"><Icon name="arrow" /></b>
              </a>
            </div>
          </aside>
        </section>

        <section className="ma-contact-form-band ma-seo-enquiry" id="enquiry" aria-label={`Plan a ${place.title} journey`}>
          <div className="ma-contact-form-copy">
            <p className="ma-badge ma-exp-badge">
              <span>Custom routes welcome</span>
              <span className="ma-badge-dot" aria-hidden="true"><Icon name="compass" /></span>
            </p>
            <h2 className="ma-two-tone">Plan <em>{place.title}.</em></h2>
            <p>
              Tell us when you want to travel, how many people are coming and what matters most. We reply with a
              day-by-day route, lodge options and a clear price in your currency.
            </p>
            <ul className="ma-trust-points">
              <li><i aria-hidden="true">✓</i> Reply within one working day</li>
              <li><i aria-hidden="true">✓</i> 30% deposit, balance 7 days before travel</li>
              <li><i aria-hidden="true">✓</i> Tanzanian-owned, {company.offices?.length || 4} offices</li>
            </ul>
          </div>
          <div className="ma-contact-form-card">
            <InquiryForm
              source="WEBSITE"
              whatsapp={whatsapp}
              heading={`Plan a ${place.title} journey`}
              intro="Fields marked * are required. Your details stay with the M&A Safaris desk."
              submitLabel="Request my itinerary"
            />
          </div>
        </section>
      </main>

      <SeoFooter company={company} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
