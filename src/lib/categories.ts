export const CATEGORIES = ['ai', 'gadgets', 'startups', 'security', 'opinion', 'general'] as const;

export type Category = (typeof CATEGORIES)[number];

const LABELS: Record<Category, string> = {
  ai: 'AI',
  gadgets: 'Gadgets',
  startups: 'Startups',
  security: 'Security',
  opinion: 'Opinion',
  general: 'General',
};

export function categoryLabel(category: Category): string {
  return LABELS[category];
}

export function categoryHref(category: Category): string {
  return `/articles/category/${category}`;
}
