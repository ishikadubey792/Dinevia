import { Testimonial } from '../models/testimonial.model';

export const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: 'test-1',
    reviewerName: 'Eleanor Vance',
    title: 'An unforgettable anniversary evening',
    reviewText: "Dinevia secured us the coveted window alcove at L'Aura Osteria for our tenth anniversary when every other channel showed zero availability. The maître d' had our bespoke tasting menu ready upon arrival. Truly unmatched hospitality.",
    rating: 5,
    restaurantName: "L'Aura Osteria",
    location: 'New York City',
    date: 'February 2026'
  },
  {
    id: 'test-2',
    reviewerName: 'Marcus Sterling',
    title: 'The gold standard for fine dining access',
    reviewText: 'As someone who travels between London and Tokyo constantly for business, Dinevia has become indispensable. Reserving the chef counter at Kura took under thirty seconds, with personalized dietary preferences seamlessly communicated.',
    rating: 5,
    restaurantName: 'Kura Omakase',
    location: 'London',
    date: 'January 2026'
  },
  {
    id: 'test-3',
    reviewerName: 'Claire & Julien Moreau',
    title: 'Discovered our new favorite culinary haven',
    reviewText: 'The curated recommendations are impeccably accurate. We explored Zaffran Pavilion on a recommendation from Dinevia and experienced one of the most sublime royal Awadhi dinners outside Lucknow. Exceptional attention to detail.',
    rating: 5,
    restaurantName: 'Zaffran Pavilion',
    location: 'Tribeca, NY',
    date: 'March 2026'
  }
];
