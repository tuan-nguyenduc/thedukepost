export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function tagHref(tag: string): string {
  return `/tags/${tagSlug(tag)}`;
}
