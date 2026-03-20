/**
 * Edge Function: Export Products and Patches to Storage
 * 
 * Exports products and patches from database to Supabase Storage
 * for fast CDN delivery without needing a full rebuild.
 * 
 * Trigger this after saving products/patches in admin panel.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const results = {
      products: { success: false, count: 0, error: null as string | null },
      patches: { success: false, count: 0, error: null as string | null },
    };

    // 1. Export Products
    console.log('📦 Exporting products...');
    try {
      const { data: products, error: productsError } = await supabaseAdmin
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (productsError) throw productsError;

      // Upload to storage
      const productsJson = JSON.stringify(products || [], null, 2);
      const { error: uploadError } = await supabaseAdmin
        .storage
        .from('assets')
        .upload('cms/products.json', productsJson, {
          contentType: 'application/json',
          upsert: true,
          cacheControl: '3600', // 1 hour cache
        });

      if (uploadError) throw uploadError;

      results.products = {
        success: true,
        count: products?.length || 0,
        error: null,
      };
      console.log(`✅ ${products?.length || 0} products exported`);
    } catch (err: any) {
      results.products = {
        success: false,
        count: 0,
        error: err.message,
      };
      console.error('❌ Failed to export products:', err);
    }

    // 2. Export Patches
    console.log('🎨 Exporting patches...');
    try {
      const { data: patches, error: patchesError } = await supabaseAdmin
        .from('patches')
        .select('*')
        .order('sort_order', { ascending: true });

      if (patchesError) throw patchesError;

      // Upload to storage
      const patchesJson = JSON.stringify(patches || [], null, 2);
      const { error: uploadError } = await supabaseAdmin
        .storage
        .from('assets')
        .upload('cms/patches.json', patchesJson, {
          contentType: 'application/json',
          upsert: true,
          cacheControl: '3600', // 1 hour cache
        });

      if (uploadError) throw uploadError;

      results.patches = {
        success: true,
        count: patches?.length || 0,
        error: null,
      };
      console.log(`✅ ${patches?.length || 0} patches exported`);
    } catch (err: any) {
      results.patches = {
        success: false,
        count: 0,
        error: err.message,
      };
      console.error('❌ Failed to export patches:', err);
    }

    const allSuccess = results.products.success && results.patches.success;

    return new Response(
      JSON.stringify({
        success: allSuccess,
        message: allSuccess
          ? `✅ Exported ${results.products.count} products and ${results.patches.count} patches`
          : '⚠️ Some exports failed. Check error details.',
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        status: allSuccess ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to export products/patches',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
