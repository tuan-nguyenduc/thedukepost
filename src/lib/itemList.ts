export interface ItemListEntry {
  label: string;
  href: string;
}

export function itemListJsonLd(
  items: ItemListEntry[],
  site: string | URL | undefined,
  opts: { name?: string; description?: string; startPosition?: number } = {}
) {
  const start = opts.startPosition ?? 1;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(opts.name ? { name: opts.name } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: start + i,
      url: new URL(item.href, site).toString(),
      name: item.label,
    })),
  };
}
