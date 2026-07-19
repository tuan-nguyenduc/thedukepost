export function authorSlug(author: string): string {
  return author
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function authorHref(author: string): string {
  return `/authors/${authorSlug(author)}`;
}
