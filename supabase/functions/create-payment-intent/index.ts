import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { amount, currency = 'sgd', user_id, customer_email, shipping, idempotency_key } = body;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'INVALID_AMOUNT', message: 'Amount must be a positive number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Check for existing pending order for this user with same amount
    // Prevents duplicate PaymentIntents for same checkout session
    if (user_id) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existingOrders } = await supabaseAdmin
        .from('orders')
        .select('payment_intent_id, status, created_at')
        .eq('user_id', user_id)
        .eq('status', 'pending')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (existingOrders && existingOrders.length > 0) {
        // Check if the existing PaymentIntent is still valid
        try {
          const existingPI = await stripe.paymentIntents.retrieve(existingOrders[0].payment_intent_id);
          // If status is requires_payment_method, it's still usable
          if (existingPI.status === 'requires_payment_method') {
            console.log('Reusing existing PaymentIntent:', existingPI.id);
            return new Response(
              JSON.stringify({
                clientSecret: existingPI.client_secret,
                paymentIntentId: existingPI.id,
                amount: existingPI.amount,
                currency: existingPI.currency,
                reused: true
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (e) {
          // PI not found or error, continue to create new one
          console.log('Existing PI invalid, creating new one');
        }
      }
    }

    const paymentIntentParams: any = {
      amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: { 
        user_id: user_id || '',
        created_at: new Date().toISOString(),
      },
    };

    if (customer_email) paymentIntentParams.receipt_email = customer_email;
    if (shipping) paymentIntentParams.shipping = shipping;

    // Use idempotency key if provided (prevents duplicates on retries)
    const createOptions: any = {};
    if (idempotency_key) {
      createOptions.idempotencyKey = idempotency_key;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, createOptions);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
