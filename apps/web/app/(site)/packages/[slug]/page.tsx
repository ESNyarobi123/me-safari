import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Icon from '../../../../components/Icon';
import InquiryForm from '../../../../components/InquiryForm';
import { Breadcrumbs, SeoFooter, SeoHeader } from '../../../../components/SeoChrome';
import { formatFrom, imageUrl, type CatalogPackage } from '../../../../lib/catalog';
import { whatsappHref } from '../../../../lib/inquiries';
import {
  absoluteUrl, packageBySlug, packagePath, seoCatalog, socialImage, SITE_URL,
} from '../../../../lib/seo-catalog';

type Params = { slug: string };

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Params[]> {
  const { packages } = await seoCatalog();
  return packages.map((item) => ({ slug: item.slug }));
}

function packageUrl(slug: string) {
  return absoluteUrl(packagePath(slug));
}

function metaDescription(item: CatalogPackage) {
  const base = `${item.durationDays}-day ${item.category} journey in Tanzania with Me and Adventure Safaris. ${item.description}`;
  return base.replace(/\s+/g, ' ').slice(0, 158);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await packageBySlug(slug);
  if (!item) return { title: 'Journey not found — M&A Safaris' };
  const url = packageUrl(item.slug);
  const image = socialImage(item);
  return {
    title: `${item.title} · ${item.durationDays} days in Tanzania | M&A Safaris`,
    description: metaDescription(item),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: `${item.title} — M&A Safaris`,
      description: metaDescription(item),
      url,
      siteName: 'M&A Safaris',
      images: [{ url: image, alt: item.title }],
    },
    twitter: { card: 'summary_large_image', title: item.title, description: metaDescription(item), images: [image] },
  };
}

export default async function PackagePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const item = await packageBySlug(slug);
  if (!item) notFound();

  const { packages, company } = await seoCatalog();
  const whatsapp = company.whatsapp || company.phone;
  const url = packageUrl(item.slug);
  const image = socialImage(item);
  const days = item.itinerary?.days ?? [];
  const related = packages.filter((entry) => entry.slug !== item.slug).slice(0, 3);
  const priceLabel = formatFrom(item);
  const wa = whatsappHref(whatsapp, {
    packageTitle: item.title,
    reference: item.slug ? `PKG-${item.slug.replace(/[^a-z0-9-]/gi, '').toUpperCase()}` : undefined,
  });
  const gallery = [item.coverUrl, ...(item.galleryUrls ?? [])]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TouristTrip',
        name: item.title,
        description: item.description,
        url,
        image,
        touristType: 'Safari travellers',
        itinerary: days.length
          ? {
              '@type': 'ItemList',
              itemListElement: days.map((day) => ({
                '@type': 'ListItem',
                position: day.day,
                name: day.title,
                description: day.description,
              })),
            }
          : undefined,
        offers: item.fromPrice
          ? {
              '@type': 'Offer',
              price: (Number(item.fromPrice.minor) / 100).toFixed(2),
              priceCurrency: item.fromPrice.currency,
              url,
              availability: 'https://schema.org/InStock',
            }
          : undefined,
        provider: {
          '@type': 'TravelAgency',
          name: company.name,
          url: SITE_URL,
          email: company.email,
          telephone: company.phone,
          address: { '@type': 'PostalAddress', addressCountry: 'TZ', addressLocality: company.headquarters || 'Arusha' },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Journeys', item: absoluteUrl('/#destinations') },
          { '@type': 'ListItem', position: 3, name: item.title, item: url },
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
          { label: 'Journeys', href: '/#destinations' },
          { label: item.title },
        ]} />

        <section className="ma-seo-hero" aria-labelledby="journeyTitle">
          <div className="ma-seo-hero-copy">
            <p className="ma-badge ma-exp-badge">
              <span>{item.category} · {item.durationDays} days</span>
              <span className="ma-badge-dot" aria-hidden="true"><Icon name="compass" /></span>
            </p>
            <h1 id="journeyTitle" className="ma-two-tone">{item.title}</h1>
            <p className="ma-seo-lead">{item.description}</p>
            <div className="ma-seo-facts">
              <span><small>Duration</small><strong>{item.durationDays} days</strong></span>
              <span><small>Style</small><strong>{item.category}</strong></span>
              <span><small>From</small><strong>{priceLabel.replace(/^From\s+/i, '')}</strong></span>
              <span><small>Deposit</small><strong>30% to confirm</strong></span>
            </div>
            <div className="ma-seo-actions">
              <a className="ma-btn ma-btn-orange" href="#enquiry">Request this journey</a>
              {wa ? <a className="ma-wa-btn" href={wa} target="_blank" rel="noreferrer">Ask on WhatsApp</a> : null}
            </div>
            <p className="ma-seo-note">
              {item.demoRate
                ? 'Demonstration rate shown while the owner approves final pricing. Your written quote is the confirmed price.'
                : 'Final price depends on dates, lodge choice and group size. The desk confirms everything in writing before any deposit.'}
            </p>
          </div>

          <div className="ma-seo-hero-media">
            <img src={imageUrl(item)} alt={`${item.title} — Tanzania safari`} width={960} height={720} />
            {gallery.length > 1 ? (
              <div className="ma-seo-gallery">
                {gallery.slice(1).map((photo) => (
                  <img key={photo} src={imageUrl({ coverUrl: photo, slug: item.slug, title: item.title })} alt="" width={320} height={240} loading="lazy" />
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="ma-seo-split" aria-label="Journey details">
          <div>
            <h2 className="ma-two-tone">Day by <em>day.</em></h2>
            {days.length ? (
              <ol className="ma-days ma-seo-days">
                {days.map((day, index) => (
                  <li key={`${day.day}-${day.title}`}>
                    <strong>Day {day.day || index + 1} · {day.title}</strong>
                    {day.description ? <span>{day.description}</span> : null}
                    {day.activities?.length ? (
                      <ul className="ma-seo-sub">
                        {day.activities.map((activity, activityIndex) => (
                          <li key={`${activity.title ?? 'stop'}-${activityIndex}`}>{activity.title ?? activity.description}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="ma-seo-body">
                This journey is tailored around your dates. The desk sends a written day-by-day plan with your quote,
                covering parks, driving times, lodges and the pace you prefer.
              </p>
            )}

            {item.goodToKnow?.length ? (
              <>
                <h3 className="ma-seo-h3">Good to know</h3>
                <ul className="ma-seo-list">
                  {item.goodToKnow.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </>
            ) : null}
          </div>

          <aside className="ma-seo-aside" aria-label="Included in this journey">
            <div className="ma-seo-panel">
              <h3>Included</h3>
              {item.inclusions?.length ? (
                <ul className="ma-seo-list">
                  {item.inclusions.map((entry) => <li key={entry}>{entry}</li>)}
                </ul>
              ) : <p>Private guiding, park fees and lodge planning are confirmed in your written quote.</p>}
            </div>
            <div className="ma-seo-panel ma-seo-panel-muted">
              <h3>Not included</h3>
              {item.exclusions?.length ? (
                <ul className="ma-seo-list">
                  {item.exclusions.map((entry) => <li key={entry}>{entry}</li>)}
                </ul>
              ) : <p>International flights, visas and personal travel insurance.</p>}
            </div>
            <div className="ma-seo-panel">
              <h3>How booking works</h3>
              <ol className="ma-seo-steps">
                <li>Send your dates and group size.</li>
                <li>The Arusha desk replies with a written itinerary and price.</li>
                <li>Pay a 30% deposit to confirm; the balance is due 7 days before travel.</li>
              </ol>
              <a className="ma-story-cta" href="/contact/">
                <span>Talk to a planner</span>
                <b aria-hidden="true"><Icon name="arrow" /></b>
              </a>
            </div>
          </aside>
        </section>

        <section className="ma-contact-form-band ma-seo-enquiry" id="enquiry" aria-label="Request this journey">
          <div className="ma-contact-form-copy">
            <p className="ma-badge ma-exp-badge">
              <span>No deposit to ask</span>
              <span className="ma-badge-dot" aria-hidden="true"><Icon name="sparkles" /></span>
            </p>
            <h2 className="ma-two-tone">Request <em>{item.title}</em></h2>
            <p>
              Tell us your dates and who is travelling. A local planner replies within one working day with lodge options,
              the day-by-day route and a clear price — no payment needed to ask.
            </p>
            <ul className="ma-trust-points">
              <li><i aria-hidden="true">✓</i> Written quote from the Arusha desk</li>
              <li><i aria-hidden="true">✓</i> 30% deposit, balance 7 days before travel</li>
              <li><i aria-hidden="true">✓</i> Tanzanian-owned, {company.offices?.length || 4} offices</li>
            </ul>
          </div>
          <div className="ma-contact-form-card">
            <InquiryForm
              source="WEBSITE_PACKAGE"
              packageSlug={item.slug}
              packageTitle={item.title}
              whatsapp={whatsapp}
              heading="Plan this journey"
              intro="Fields marked * are required. Your details stay with the M&A Safaris desk."
              submitLabel="Request this journey"
            />
          </div>
        </section>

        {related.length ? (
          <section className="ma-seo-related" aria-labelledby="relatedTitle">
            <div className="ma-seo-related-head">
              <h2 id="relatedTitle" className="ma-two-tone">Other <em>journeys.</em></h2>
              <a className="ma-story-cta" href="/#destinations">
                <span>See every journey</span>
                <b aria-hidden="true"><Icon name="arrow" /></b>
              </a>
            </div>
            <div className="ma-seo-related-grid">
              {related.map((entry) => (
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
      </main>

      <SeoFooter company={company} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
