// Supabase Edge Function: Trigger site rebuild
// Supports Vercel, Netlify, and custom webhooks

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface RebuildRequest {
  deployHook?: string;
  provider?: 'vercel' | 'netlify' | 'custom';
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { deployHook, provider = 'custom' } = await req.json() as RebuildRequest

    // Check for environment-configured webhook
    const envWebhook = Deno.env.get('DEPLOY_WEBHOOK_URL')
    const webhookUrl = deployHook || envWebhook

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No deploy webhook configured',
          message: 'Please set DEPLOY_WEBHOOK_URL environment variable or provide deployHook in request'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Triggering ${provider} rebuild...`)

    // Trigger the rebuild webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: 'cms-update',
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Deploy hook failed: ${response.status} ${errorText}`)
    }

    const responseData = await response.json().catch(() => ({}))

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Rebuild triggered successfully',
        provider,
        jobId: responseData.job?.id || responseData.id || null,
        url: responseData.url || null,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Rebuild error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to trigger rebuild. Please check your webhook configuration.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
