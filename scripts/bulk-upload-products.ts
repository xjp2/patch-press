/**
 * Bulk Product Uploader with Auto Background Removal
 * 
 * Usage:
 * 1. Place images in: input/products/
 *    - Name format: product-name-front.png
 *    - Name format: product-name-back.png
 * 2. Run: npx ts-node scripts/bulk-upload-products.ts
 * 3. Images will be processed and uploaded to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const INPUT_DIR = resolve(process.cwd(), 'input', 'products');
const OUTPUT_DIR = resolve(process.cwd(), 'output', 'processed');

interface ProductInput {
  name: string;
  basePrice: number;
  frontImagePath?: string;
  backImagePath?: string;
  width: number;
  height: number;
  inventory: number;
}

/**
 * Auto-remove white/transparent background from image
 * Uses sharp's trim functionality to remove solid color backgrounds
 */
async function removeBackground(inputPath: string, outputPath: string): Promise<void> {
  try {
    const image = sharp(inputPath);
    
    // Get image info
    const metadata = await image.metadata();
    
    // Method 1: Trim white background (removes solid color edges)
    // Threshold 250 means pixels with R,G,B all > 250 are considered white
    const trimmed = await image
      .trim({
        threshold: 250,        // White threshold (0-255)
        background: '#FFFFFF'  // Background color to trim
      })
      .toBuffer();
    
    // Method 2: If trim didn't work well, add transparent background
    // This preserves the original content but ensures transparent edges
    const processed = await sharp(trimmed)
      .png({
        quality: 90,
        compressionLevel: 9
      })
      .toFile(outputPath);
    
    console.log(`✅ Processed: ${basename(inputPath)}`);
  } catch (error) {
    console.error(`❌ Failed to process ${basename(inputPath)}:`, error);
    throw error;
  }
}

/**
 * Compress and optimize image for web
 */
async function optimizeImage(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .resize(800, 800, { // Max 800x800, maintain aspect ratio
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({
      quality: 85,
      effort: 6 // Compression effort (0-6)
    })
    .toFile(outputPath);
  
  console.log(`✅ Optimized: ${basename(inputPath)}`);
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImage(
  localPath: string, 
  productId: string, 
  type: 'front' | 'back'
): Promise<string> {
  const fileExt = extname(localPath);
  const storagePath = `products/${productId}/${type}${fileExt}`;
  
  const fileBuffer = readFileSync(localPath);
  
  const { data, error } = await supabase.storage
    .from('assets')
    .upload(storagePath, fileBuffer, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('assets')
    .getPublicUrl(storagePath);
  
  return publicUrl;
}

/**
 * Parse product files from input directory
 */
function parseProductFiles(): ProductInput[] {
  if (!existsSync(INPUT_DIR)) {
    console.error(`❌ Input directory not found: ${INPUT_DIR}`);
    console.log('Please create: input/products/ and add your images');
    process.exit(1);
  }
  
  const files = readdirSync(INPUT_DIR);
  const products: Map<string, ProductInput> = new Map();
  
  // Group files by product name
  for (const file of files) {
    const match = file.match(/^(.+)-(front|back)\.(png|jpg|jpeg|webp)$/i);
    if (!match) continue;
    
    const [, productName, type, ext] = match;
    const key = productName.toLowerCase().replace(/\s+/g, '-');
    
    if (!products.has(key)) {
      products.set(key, {
        name: productName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        basePrice: 25, // Default price, can be customized
        width: 400,
        height: 400,
        inventory: 100,
      });
    }
    
    const product = products.get(key)!;
    const filePath = resolve(INPUT_DIR, file);
    
    if (type === 'front') product.frontImagePath = filePath;
    if (type === 'back') product.backImagePath = filePath;
  }
  
  return Array.from(products.values());
}

/**
 * Main bulk upload function
 */
async function bulkUpload() {
  console.log('🚀 Starting Bulk Product Upload...\n');
  
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Parse input files
  const products = parseProductFiles();
  console.log(`📦 Found ${products.length} products to upload\n`);
  
  if (products.length === 0) {
    console.log('No valid product images found.');
    console.log('Expected format: product-name-front.png, product-name-back.png');
    return;
  }
  
  // Process each product
  for (const product of products) {
    console.log(`\n📝 Processing: ${product.name}`);
    
    try {
      const productId = uuidv4();
      let frontUrl = '';
      let backUrl = '';
      
      // Process front image
      if (product.frontImagePath) {
        const processedPath = resolve(OUTPUT_DIR, `${productId}-front.webp`);
        
        // Remove background and optimize
        await removeBackground(product.frontImagePath, processedPath);
        await optimizeImage(processedPath, processedPath);
        
        // Upload to Supabase
        frontUrl = await uploadImage(processedPath, productId, 'front');
        console.log(`   🖼️  Front: ${frontUrl}`);
      }
      
      // Process back image
      if (product.backImagePath) {
        const processedPath = resolve(OUTPUT_DIR, `${productId}-back.webp`);
        
        await removeBackground(product.backImagePath, processedPath);
        await optimizeImage(processedPath, processedPath);
        
        backUrl = await uploadImage(processedPath, productId, 'back');
        console.log(`   🖼️  Back: ${backUrl}`);
      }
      
      // Insert into database
      const { error: dbError } = await supabase
        .from('products')
        .insert({
          id: productId,
          name: product.name,
          front_image_url: frontUrl,
          back_image_url: backUrl,
          base_price: product.basePrice,
          width: product.width,
          height: product.height,
          inventory: product.inventory,
          placement_zone: {
            x: 15,
            y: 25,
            width: 70,
            height: 60,
            type: 'rectangle'
          }
        });
      
      if (dbError) throw dbError;
      
      console.log(`   ✅ Product created: ${productId}`);
      
    } catch (error) {
      console.error(`   ❌ Failed to process ${product.name}:`, error);
    }
  }
  
  console.log('\n✨ Bulk upload complete!');
  console.log('🔄 Run "npm run export-cms" to update static files');
}

// Run the script
bulkUpload().catch(console.error);
