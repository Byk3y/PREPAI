/**
 * Testimonial Data
 * Externalized testimonials for easy content management and updates
 */

export interface Testimonial {
  stars: string;
  text: string;
  author: string;
}

/**
 * Testimonials displayed on Screen 6 (Social Proof)
 * These can be easily updated or fetched from a CMS in the future
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    stars: '⭐⭐⭐⭐⭐',
    text: "I actually remember what I study now. No more cramming and forgetting everything the next day.",
    author: 'Sarah M., Pre-Med Student',
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    text: "Studying 15 minutes with PrepAI beats 2 hours of highlighting. My test scores prove it.",
    author: 'David L., Engineering Student',
  },
];


