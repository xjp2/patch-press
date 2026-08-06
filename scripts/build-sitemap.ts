/**
 * Build-time SEO file generator
 *
 * Generates robots.txt and sitemap.xml in the public/ folder based on the
 * exported CMS data. Run automatically during `npm run build`.
 */

import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const CMS_DIR = path.join(PUBLIC_DIR, 'cms');
const SITE_URL = process.env.VITE_SITE_URL || 'https://patchuu.com';

interface Product {
  id: string;
  name: string;
  updated_at?: string;
}

function formatDate(date?: string): string {
  if (!date) return new Date().toISOString().split('T')[0];
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function buildSitemap(products: Product[]): string {
  const today = formatDate();
  const staticUrls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { loc: '/terms', priority: '0.3', changefreq: 'yearly' },
    { loc: '/refund', priority: '0.3', changefreq: 'yearly' },
    { loc: '/shipping', priority: '0.3', changefreq: 'yearly' },
  ];

  const productUrls = products.map((p) => ({
    loc: `/?product=${encodeURIComponent(p.id)}`,
    priority: '0.8',
    changefreq: 'weekly',
    lastmod: formatDate(p.updated_at),
  }));

  const urls = [...staticUrls, ...productUrls];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
}

function buildRobots(): string {
  return `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

async function generate() {
  console.log('🗺️  Generating SEO files...\n');

  let products: Product[] = [];
  try {
    const productsPath = path.join(CMS_DIR, 'products.json');
    if (fs.existsSync(productsPath)) {
      products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    }
  } catch (err) {
    console.warn('⚠️  Could not read products.json for sitemap:', err);
  }

  const sitemap = buildSitemap(products);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
  console.log(`   ✅ sitemap.xml written (${products.length + 5} URLs)`);

  const robots = buildRobots();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robots);
  console.log('   ✅ robots.txt written');

  console.log('\n💡 Set VITE_SITE_URL to your production domain for accurate sitemap URLs.\n');
}

generate().catch((err) => {
  console.error('Failed to generate SEO files:', err);
  process.exit(1);
});
