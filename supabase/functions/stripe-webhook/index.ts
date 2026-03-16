import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
  cryptoProvider: new Stripe.SubtleCryptoProvider(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the raw body
    const body = await req.text();
    
    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing webhook event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);
  
  // Find order created by frontend
  const { data: order, error: findError } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, status')
    .eq('payment_intent_id', paymentIntent.id)
    .single();
    
  if (findError || !order) {
    console.warn('No order found for payment intent:', paymentIntent.id);
    // Could create order here as fallback, but log for now
    return;
  }
  
  // SECURITY: Validate order total matches Stripe payment amount
  const stripeAmount = paymentIntent.amount / 100; // Convert cents to dollars
  const orderAmount = order.total_amount;
  
  // Allow small floating point differences (0.01 tolerance)
  const tolerance = 0.01;
  if (Math.abs(stripeAmount - orderAmount) > tolerance) {
    console.error(`AMOUNT MISMATCH! Order: ${orderAmount}, Stripe: ${stripeAmount}`);
    // Mark as fraudulent/pending_review instead of paid
    await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'amount_mismatch',
        payment_verified: false,
        metadata: {
          warning: 'Order amount does not match Stripe payment amount',
          order_amount: orderAmount,
          stripe_amount: stripeAmount
        }
      })
      .eq('id', order.id);
    return;
  }
  
  // VALID: Mark order as payment verified
  await supabaseAdmin
    .from('orders')
    .update({ 
      status: 'paid',
      payment_verified: true,
      paid_at: new Date().toISOString()
    })
    .eq('id', order.id);
    
  console.log('Order validated and marked paid:', order.id);
  
  // Clear user's cart
  const userId = paymentIntent.metadata?.user_id;
  if (userId) {
    await supabaseAdmin.from('cart_items').delete().eq('user_id', userId);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  
  const lastError = paymentIntent.last_payment_error;
  console.error('Payment error:', lastError?.message);
  
  // Log failed payment for analytics
  try {
    await supabaseAdmin
      .from('payment_logs')
      .insert({
        payment_intent_id: paymentIntent.id,
        status: 'failed',
        error_message: lastError?.message || 'Unknown error',
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        created_at: new Date().toISOString(),
      });
  } catch (e) {
    // Table might not exist, ignore
    console.log('Could not log payment failure:', e);
  }
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}
