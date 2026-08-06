/**
 * Trigger a Vercel deploy with fresh CMS data
 *
 * Instead of committing exported JSON to git, this calls the `rebuild-site`
 * Supabase Edge Function, which hits your Vercel deploy hook. Vercel then
 * runs `npm run export-cms` during the build to pull the latest data from
 * Supabase.
 *
 * Usage: npm run export-and-deploy
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function triggerDeploy() {
  console.log('🚀 Triggering Vercel deploy via rebuild-site Edge Function...\n');

  try {
    const { data, error } = await supabase.functions.invoke('rebuild-site', {
      body: {},
    });

    if (error) throw error;

    if (!data?.success) {
      throw new Error(data?.error || 'Deploy hook returned failure');
    }

    console.log('✅ Deploy triggered successfully');
    if (data.jobId) console.log(`   Job ID: ${data.jobId}`);
    if (data.url) console.log(`   URL: ${data.url}`);
    console.log('\n💡 Vercel will now build the site and fetch fresh CMS data from Supabase.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to trigger deploy:', message);
    if (message.includes('No deploy webhook configured')) {
      console.error('\n💡 Set the DEPLOY_WEBHOOK_URL secret in your Supabase Edge Function settings.');
      console.error('   You can get this URL from Vercel → Project Settings → Git → Deploy Hooks.');
    }
    process.exit(1);
  }
}

triggerDeploy();
