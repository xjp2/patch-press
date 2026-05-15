/**
 * Image Sync Script
 *
 * Downloads product and patch images from Supabase Storage to local public/ folder
 * so they get served from Vercel's CDN. Removes orphaned images.
 *
 * Run after export-cms: npm run sync-images
 */

import fs from 'fs';
import path from 'path';

const PRODUCTS_DIR = path.join(process.cwd(), 'public', 'products');
const PATCHES_DIR = path.join(process.cwd(), 'public', 'patches');
const CMS_DIR = path.join(process.cwd(), 'public', 'cms');
const IMAGE_MAP_FILE = path.join(CMS_DIR, 'image-map.json');

interface ImageMap {
  [supabaseUrl: string]: string;
}

function extractFilenameFromUrl(url: string): string {
  // Extract the last path segment as filename
  const decoded = decodeURIComponent(url);
  const match = decoded.match(/\/([^\/]+)$/);
  return match ? match[1] : `${Date.now()}.png`;
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`   ❌ HTTP ${response.status} for ${url}`);
      return false;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err) {
    console.error(`   ❌ Download failed: ${url}`, err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function syncImages() {
  console.log('🚀 Starting image sync...\n');

  // Ensure directories exist
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  fs.mkdirSync(PATCHES_DIR, { recursive: true });
  fs.mkdirSync(CMS_DIR, { recursive: true });

  // Load existing image map (if any)
  let imageMap: ImageMap = {};
  if (fs.existsSync(IMAGE_MAP_FILE)) {
    try {
      imageMap = JSON.parse(fs.readFileSync(IMAGE_MAP_FILE, 'utf8'));
    } catch {
      imageMap = {};
    }
  }

  // Read exported JSON files
  const productsPath = path.join(CMS_DIR, 'products.json');
  const patchesPath = path.join(CMS_DIR, 'patches.json');

  if (!fs.existsSync(productsPath) || !fs.existsSync(patchesPath)) {
    console.warn('⚠️  products.json or patches.json not found. Run export-cms first.');
    process.exit(0);
  }

  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const patches = JSON.parse(fs.readFileSync(patchesPath, 'utf8'));

  const newDownloads: string[] = [];
  let skippedCount = 0;

  // ── Sync Product Images ──
  for (const product of products) {
    const url: string = product.front_image_url || '';
    if (!url || !url.startsWith('http')) continue;

    const filename = extractFilenameFromUrl(url);
    const localPath = `/products/${filename}`;
    const destPath = path.join(PRODUCTS_DIR, filename);

    if (fs.existsSync(destPath)) {
      // Already downloaded
      product.front_image_url = localPath;
      imageMap[url] = localPath;
      skippedCount++;
    } else {
      console.log(`📥 [Product] ${product.name || product.id}: ${filename}`);
      const success = await downloadImage(url, destPath);
      if (success) {
        product.front_image_url = localPath;
        imageMap[url] = localPath;
        newDownloads.push(localPath);
      }
    }
  }

  // ── Sync Patch Images ──
  for (const patch of patches) {
    const url: string = patch.image || '';
    if (!url || !url.startsWith('http')) continue;

    const filename = extractFilenameFromUrl(url);
    const localPath = `/patches/${filename}`;
    const destPath = path.join(PATCHES_DIR, filename);

    if (fs.existsSync(destPath)) {
      // Already downloaded
      patch.image = localPath;
      imageMap[url] = localPath;
      skippedCount++;
    } else {
      console.log(`📥 [Patch] ${patch.name || patch.id}: ${filename}`);
      const success = await downloadImage(url, destPath);
      if (success) {
        patch.image = localPath;
        imageMap[url] = localPath;
        newDownloads.push(localPath);
      }
    }
  }

  // ── Remove Orphaned Images ──
  const referencedProducts = new Set(
    products
      .map((p: any) => p.front_image_url)
      .filter((u: string) => u && u.startsWith('/products/'))
      .map((u: string) => path.basename(u))
  );

  const referencedPatches = new Set(
    patches
      .map((p: any) => p.image)
      .filter((u: string) => u && u.startsWith('/patches/'))
      .map((u: string) => path.basename(u))
  );

  let removedCount = 0;

  if (fs.existsSync(PRODUCTS_DIR)) {
    for (const file of fs.readdirSync(PRODUCTS_DIR)) {
      if (!referencedProducts.has(file)) {
        console.log(`🗑️  Removing orphaned product image: ${file}`);
        fs.unlinkSync(path.join(PRODUCTS_DIR, file));
        removedCount++;
      }
    }
  }

  if (fs.existsSync(PATCHES_DIR)) {
    for (const file of fs.readdirSync(PATCHES_DIR)) {
      if (!referencedPatches.has(file)) {
        console.log(`🗑️  Removing orphaned patch image: ${file}`);
        fs.unlinkSync(path.join(PATCHES_DIR, file));
        removedCount++;
      }
    }
  }

  // ── Save Updated Files ──
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
  fs.writeFileSync(patchesPath, JSON.stringify(patches, null, 2));
  fs.writeFileSync(IMAGE_MAP_FILE, JSON.stringify(imageMap, null, 2));

  console.log('\n' + '='.repeat(50));
  console.log('📊 Image Sync Summary');
  console.log('='.repeat(50));
  console.log(`✅ New downloads: ${newDownloads.length}`);
  console.log(`⏭️  Already cached: ${skippedCount}`);
  console.log(`🗑️  Orphans removed: ${removedCount}`);
  console.log(`📁 Total in image-map: ${Object.keys(imageMap).length}`);
  console.log('='.repeat(50));
}

syncImages().catch((err) => {
  console.error('💥 Fatal error during image sync:', err);
  process.exit(1);
});
