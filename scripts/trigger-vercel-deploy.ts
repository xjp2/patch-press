/**
 * Trigger Vercel Deploy with Fresh CMS Data
 * 
 * This script:
 * 1. Exports fresh CMS data from Supabase
 * 2. Commits the updated JSON files
 * 3. Triggers Vercel deploy
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'cms');

async function exportAndDeploy() {
  console.log('🚀 Starting CMS export and deploy...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // 1. Export Site Content
    console.log('📄 Exporting site content...');
    const { data: siteContent, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('id', 'current')
      .single();

    if (error) throw error;

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'site-content.json'),
      JSON.stringify(siteContent, null, 2)
    );
    console.log('   ✅ Site content exported');
    console.log('   📊 Navbar position:', siteContent?.navbar?.position);
    console.log('   📊 Global logo:', siteContent?.global_settings?.logoText);

    // 2. Export Products
    console.log('\n🎒 Exporting products...');
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (prodError) throw prodError;

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'products.json'),
      JSON.stringify(products || [], null, 2)
    );
    console.log(`   ✅ ${products?.length || 0} products exported`);

    // 3. Export Patches
    console.log('\n🧵 Exporting patches...');
    const { data: patches, error: patchError } = await supabase
      .from('patches')
      .select('*')
      .order('sort_order', { ascending: true });

    if (patchError) throw patchError;

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'patches.json'),
      JSON.stringify(patches || [], null, 2)
    );
    console.log(`   ✅ ${patches?.length || 0} patches exported`);

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

    console.log('\n📦 Export complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Commit these changes:');
    console.log('      git add public/cms/');
    console.log('      git commit -m "Update CMS content"');
    console.log('      git push origin main');
    console.log('   2. Vercel will auto-deploy the new commit');
    console.log('\n⚠️  IMPORTANT: You must push to GitHub for Vercel to see the changes!');

  } catch (err) {
    console.error('❌ Export failed:', err);
    process.exit(1);
  }
}

exportAndDeploy();
