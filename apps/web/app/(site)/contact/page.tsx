import type { Metadata } from 'next';
import ContactPage from '../../../components/ContactPage';

export const metadata: Metadata = {
  title: 'Contact the safari desk — M&A Safaris',
  description: 'Speak to a local Tanzanian safari planner in Arusha. Request a written itinerary, ask about dates, or chat on WhatsApp.',
};

export default function Contact() {
  return <ContactPage />;
}
