/**
 * Build-time CMS Export Script
 * 
 * Exports static content from Supabase to local JSON files.
 * Run this before building: npm run export-cms
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Missing Supabase environment variables!');
  console.warn('   Skipping CMS export. Using existing static files.');
  console.warn('   To export fresh data, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  // Create empty result without error
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'cms');

interface ExportResult {
  success: boolean;
  file: string;
  count?: number;
  error?: string;
}

async function exportData(): Promise<ExportResult[]> {
  const results: ExportResult[] = [];

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🚀 Starting CMS export...\n');

  // 1. Export Site Content
  try {
    console.log('📄 Exporting site content...');
    console.log('   ⏰ Timestamp:', new Date().toISOString());
    
    // Add cache-busting to ensure fresh data
    const { data: siteContent, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('id', 'current')
      .single();

    if (error) throw error;

    // Verify we got data
    if (!siteContent) {
      throw new Error('No site_content returned from Supabase');
    }

    // Log what we got
    console.log('   📊 Data received:');
    console.log('      - Updated at:', siteContent.updated_at);
    console.log('      - Landing page sections:', siteContent.landing_page?.length || 0);
    console.log('      - Navbar position:', siteContent.navbar?.position);
    console.log('      - Global logo:', siteContent.global_settings?.logoText);

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'site-content.json'),
      JSON.stringify(siteContent, null, 2)
    );

    results.push({
      success: true,
      file: 'site-content.json',
      count: 1
    });
    console.log('   ✅ Site content exported\n');
  } catch (err) {
    results.push({
      success: false,
      file: 'site-content.json',
      error: err instanceof Error ? err.message : String(err)
    });
    console.error('   ❌ Failed to export site content:', err, '\n');
  }

  // 2. Export Products
  try {
    console.log('🎒 Exporting products...');
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'products.json'),
      JSON.stringify(products || [], null, 2)
    );

    results.push({
      success: true,
      file: 'products.json',
      count: products?.length || 0
    });
    console.log(`   ✅ ${products?.length || 0} products exported\n`);
  } catch (err) {
    results.push({
      success: false,
      file: 'products.json',
      error: err instanceof Error ? err.message : String(err)
    });
    console.error('   ❌ Failed to export products:', err, '\n');
  }

  // 3. Export Patches
  try {
    console.log('🧵 Exporting patches...');
    const { data: patches, error } = await supabase
      .from('patches')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'patches.json'),
      JSON.stringify(patches || [], null, 2)
    );

    results.push({
      success: true,
      file: 'patches.json',
      count: patches?.length || 0
    });
    console.log(`   ✅ ${patches?.length || 0} patches exported\n`);
  } catch (err) {
    results.push({
      success: false,
      file: 'patches.json',
      error: err instanceof Error ? err.message : String(err)
    });
    console.error('   ❌ Failed to export patches:', err, '\n');
  }

  // 4. Export metadata
  const metadata = {
    exportedAt: new Date().toISOString(),
    supabaseUrl,
    version: '1.0.0'
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  return results;
}

// Run export
exportData()
  .then((results) => {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Export Summary: ${successCount} succeeded, ${failCount} failed`);
    console.log('='.repeat(50));

    results.forEach(r => {
      const icon = r.success ? '✅' : '❌';
      const count = r.count !== undefined ? `(${r.count} items)` : '';
      console.log(`${icon} ${r.file} ${count}`);
      if (r.error) {
        console.log(`   Error: ${r.error}`);
      }
    });

    console.log('\n💡 Next steps:');
    console.log('   1. Run "npm run build" to create optimized build');
    console.log('   2. Deploy the dist/ folder with CMS content\n');

    process.exit(failCount > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('💥 Fatal error during export:', err);
    process.exit(1);
  });
