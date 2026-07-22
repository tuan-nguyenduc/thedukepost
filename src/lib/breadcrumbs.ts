export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[], site: string | URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: new URL(item.href, site).toString(),
    })),
  };
}
