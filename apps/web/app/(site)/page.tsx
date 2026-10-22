import Landing from '../../components/Landing';
import { seoCatalog } from '../../lib/seo-catalog';

/**
 * The landing page receives a build-time catalog snapshot so the exported HTML
 * already contains the real journeys and destination links (crawlable, no JS),
 * while the client still refreshes from the live public API after hydration.
 */
export default async function Home() {
  const { packages, company, destinations, live } = await seoCatalog();
  return <Landing initialPackages={packages} initialCompany={company} initialDestinations={destinations} initialLive={live} />;
}
