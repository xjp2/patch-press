const DEFAULT_IMAGE = '/hero/patchuu-logo.png';
const SITE_NAME = 'Patch & Press';

export interface SeoData {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function productJsonLd(product: {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  currency: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `Customize your own ${product.name}`,
    image: product.image || DEFAULT_IMAGE,
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency,
      price: String(product.price),
      availability: 'https://schema.org/InStock',
      url: typeof window !== 'undefined' ? window.location.href : '',
    },
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: typeof window !== 'undefined' ? window.location.origin : '',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: typeof window !== 'undefined'
          ? `${window.location.origin}/?search={search_term_string}`
          : '/?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
