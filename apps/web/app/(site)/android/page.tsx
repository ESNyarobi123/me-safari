import type { Metadata } from 'next';
import Icon from '../../../components/Icon';
import { ANDROID_APP } from '../../../lib/app-release';
import { absoluteUrl } from '../../../lib/seo-catalog';

const url = absoluteUrl('/android/');

export const metadata: Metadata = {
  title: 'Download the M&A Safaris Android app — M&A Safaris',
  description:
    'Install the official M&A Safaris Android app (APK). Offline itineraries, live Arusha pickup updates and a direct line to your Tanzanian safari planner.',
  alternates: { canonical: url },
  openGraph: {
    title: 'Download the M&A Safaris Android app',
    description: 'Official Android APK: offline itineraries, live pickup updates and a direct line to the Arusha desk.',
    url,
    siteName: 'M&A Safaris',
    type: 'website',
  },
};

const screens = [
  { title: 'Explore Tanzania', src: '/assets/app-screens/screen-explore.jpg' },
  { title: 'Live itinerary', src: '/assets/app-screens/screen-itinerary.jpg' },
  { title: 'Trip support', src: '/assets/app-screens/screen-support.jpg' },
];

const steps = [
  ['Download the APK', 'Tap the button above. The file is small and installs straight from this page — no store account needed.'],
  ['Allow the install', 'Android asks once for permission to install from this source. Open Settings, allow this browser, then return and tap the file.'],
  ['Sign in as usual', 'Use the same email and password as the website. Your saved journeys and live trip updates are already there.'],
];

export default function AndroidDownloadPage() {
  return (
    <div className="ma ma-android-page">
      <header className="ma-top">
        <div className="ma-wrap ma-top-row">
          <a className="ma-logo" href="/" aria-label="M&amp;A Safaris home">
            <img src="/assets/brand-logo.png" alt="Me and Adventure Safaris" width="44" height="44" />
            <span>M&amp;A<br />Safaris</span>
          </a>
          <nav aria-label="Page sections">
            <a href="/">Home</a>
            <a href="/#destinations">Experiences</a>
            <a href="/#services">Services</a>
            <a href="/#rentals">Rentals</a>
            <a href="/contact/">Contact</a>
          </nav>
          <div className="ma-top-tools">
            <a className="ma-btn ma-btn-orange" href="/#destinations">Explore journeys</a>
          </div>
        </div>
      </header>

      <main className="ma-wrap ma-android-main">
        <section className="ma-android-hero" aria-labelledby="androidTitle">
          <div className="ma-android-copy">
            <p className="ma-badge ma-exp-badge">
              <span>Android app · version {ANDROID_APP.version}</span>
              <span className="ma-badge-dot" aria-hidden="true"><Icon name="download" /></span>
            </p>
            <h1 id="androidTitle" className="ma-two-tone">The safari desk, <em>in your pocket.</em></h1>
            <p className="ma-android-lead">
              The official M&amp;A Safaris Android app keeps your itinerary, Arusha pickup updates and the safari desk chat in one
              place — and it still works when the signal drops out in the park.
            </p>

            <div className="ma-android-actions">
              <a className="ma-btn ma-btn-orange ma-android-download" href={ANDROID_APP.downloadPath} download>
                <Icon name="download" />
                <span>Download APK</span>
              </a>
              <a className="ma-text-btn" href="#install">How to install</a>
            </div>

            <ul className="ma-android-meta" aria-label="Release details">
              <li><strong>v{ANDROID_APP.version}</strong><span>Latest release</span></li>
              <li><strong>Android {ANDROID_APP.minimumAndroid}+</strong><span>Minimum version</span></li>
              <li><strong>APK</strong><span>Direct install</span></li>
            </ul>
          </div>

          <div className="ma-android-stage" aria-hidden="true">
            {screens.map((screen, index) => (
              <figure key={screen.src} className={`ma-android-phone ma-android-phone-${index + 1}`}>
                <img src={screen.src} alt="" width="220" height="470" />
                <figcaption>{screen.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="ma-android-install" id="install" aria-labelledby="installTitle">
          <div className="ma-android-install-head">
            <p className="ma-badge ma-exp-badge">
              <span>Three taps · no account on the store</span>
              <span className="ma-badge-dot" aria-hidden="true"><Icon name="sparkles" /></span>
            </p>
            <h2 id="installTitle" className="ma-two-tone">Install it <em>in a minute.</em></h2>
          </div>
          <ol className="ma-android-steps">
            {steps.map(([title, body], index) => (
              <li key={title}>
                <b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>
                <strong>{title}</strong>
                <p>{body}</p>
              </li>
            ))}
          </ol>

          <div className="ma-android-notes">
            <p><strong>iPhone?</strong> The iOS release is in App Store review. Use this website on your iPhone until it is approved.</p>
            <p><strong>Already installed?</strong> Opening the APK again installs the update over your existing app; your sign-in is kept.</p>
            <p className="ma-android-checksum">
              Package <code>{ANDROID_APP.packageId}</code> · built against <code>api.meandadventuresafaris.com</code>
            </p>
          </div>
        </section>
      </main>

      <footer className="ma-android-footer">
        <div className="ma-wrap">
          <p>Me and Adventure Safaris · Arusha, Tanzania</p>
          <p><a href="/">Back to the journeys</a> · <a href="/contact/">Talk to the desk</a></p>
        </div>
      </footer>
    </div>
  );
}
