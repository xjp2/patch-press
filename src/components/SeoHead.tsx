import { useEffect } from 'react';
import type { SeoData } from '../lib/seo';

const DEFAULT_DESCRIPTION =
  'Patchuu — customize your own tote bags, keychains, pouches, and cardholders with cute patches. We press them for you!';
const DEFAULT_IMAGE = '/hero/patchuu-logo.png';
const SITE_NAME = 'Patch & Press';

function setMeta(selector: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    const match = selector.match(/\[([^=]+)="([^"]+)"\]/);
    if (match) {
      el.setAttribute(match[1], match[2]);
    }
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkRelCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(data?: Record<string, unknown> | Record<string, unknown>[]) {
  const existing = document.head.querySelectorAll('script[data-seo-jsonld]');
  existing.forEach((script) => script.remove());

  if (!data) return;

  const values = Array.isArray(data) ? data : [data];
  values.forEach((value) => {
    const script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-seo-jsonld', 'true');
    script.textContent = JSON.stringify(value);
    document.head.appendChild(script);
  });
}

export function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical = typeof window !== 'undefined' ? window.location.href : '',
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd,
}: SeoData) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[property="og:type"]', type);
    setMeta('meta[property="og:site_name"]', SITE_NAME);
    setMeta('meta[name="twitter:card"]', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', image);

    if (canonical) {
      setLinkRelCanonical(canonical);
    }

    if (noindex) {
      setMeta('meta[name="robots"]', 'noindex, nofollow');
    } else {
      const noindexMeta = document.head.querySelector('meta[name="robots"]');
      if (noindexMeta && noindexMeta.getAttribute('content')?.includes('noindex')) {
        noindexMeta.remove();
      }
    }

    setJsonLd(jsonLd);
  }, [title, description, canonical, image, type, noindex, jsonLd]);

  return null;
}
