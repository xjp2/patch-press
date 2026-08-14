import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://patchuu.shop',
    'https://www.patchuu.shop',
    'http://localhost:5175',
    'http://localhost:3000',
  ];
  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://patchuu.shop',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

function responseHeaders(req: Request): HeadersInit {
  return {
    ...getCorsHeaders(req),
    'Content-Type': 'application/json',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: responseHeaders(req) });
  }

  try {
    let sessionId: string | undefined;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      sessionId = url.searchParams.get('session_id') || undefined;
    } else if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      sessionId = body.session_id;
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'MISSING_SESSION_ID', message: 'session_id is required' }),
        { status: 400, headers: responseHeaders(req) }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    // Look up the created order by PaymentIntent ID
    let order: any = null;
    if (paymentIntentId) {
      const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_number, status, total_amount, currency')
        .eq('payment_intent_id', paymentIntentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Failed to fetch order:', error);
      } else {
        order = orders?.[0] || null;
      }
    }

    return new Response(
      JSON.stringify({
        status: session.status,
        paymentStatus: session.payment_status,
        paymentIntentId,
        clientReferenceId: session.client_reference_id,
        amountTotal: session.amount_total,
        currency: session.currency,
        orderId: order?.id || null,
        orderNumber: order?.order_number || session.client_reference_id || null,
        orderStatus: order?.status || null,
      }),
      { status: 200, headers: responseHeaders(req) }
    );
  } catch (error: any) {
    console.error('Error retrieving checkout session:', error);
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message: error.message }),
      { status: 500, headers: responseHeaders(req) }
    );
  }
});
