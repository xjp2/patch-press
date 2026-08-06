import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw']);

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
    'Vary': 'Authorization, Origin',
    'Content-Type': 'application/json',
  };
}

async function fetchExchangeRate(targetCurrency: string): Promise<number> {
  const target = targetCurrency.toUpperCase();
  if (target === 'SGD') return 1;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/SGD');
    const data = await res.json();
    if (data?.rates?.[target]) {
      return data.rates[target];
    }
  } catch (err) {
    console.error('Failed to fetch exchange rate:', err);
  }
  throw new Error('EXCHANGE_RATE_UNAVAILABLE');
}

function toStripeAmount(currency: string, amount: number): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

function fromStripeAmount(currency: string, amount: number): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return amount;
  }
  return amount / 100;
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

interface CartItemInput {
  productId: string;
  quantity: number;
  frontPatches: string[];
  backPatches: string[];
}

function extractPatchId(p: any): string | null {
  if (typeof p === 'string') return p;
  if (p && typeof p === 'object' && typeof p.id === 'string') return p.id;
  return null;
}

function mapShippingAddress(shipping: any): any {
  if (!shipping || typeof shipping !== 'object') return null;
  return {
    name: shipping.name || '',
    address_line1: shipping.address?.line1,
    address_line2: shipping.address?.line2,
    city: shipping.address?.city,
    state: shipping.address?.state,
    postal_code: shipping.address?.postal_code,
    country: shipping.address?.country,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: responseHeaders(req) });
  }

  try {
    // a. Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'AUTH_REQUIRED', message: 'Authorization header is required' }),
        { status: 401, headers: responseHeaders(req) }
      );
    }

    // b. Verify JWT with Supabase admin client and use the returned user
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('JWT verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'AUTH_INVALID', message: 'Invalid or expired authorization token' }),
        { status: 401, headers: responseHeaders(req) }
      );
    }

    const user = userData.user;

    const body = await req.json();
    const { cartItems, currency = 'sgd', customer_email, shipping, idempotency_key } = body;

    // c. Validate cartItems
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'INVALID_CART', message: 'cartItems must be a non-empty array' }),
        { status: 400, headers: responseHeaders(req) }
      );
    }

    const validatedItems: CartItemInput[] = [];
    for (const item of cartItems) {
      if (!item?.productId || typeof item.productId !== 'string') {
        return new Response(
          JSON.stringify({ error: 'INVALID_PRODUCT_ID', message: 'Each cart item must have a non-empty productId' }),
          { status: 400, headers: responseHeaders(req) }
        );
      }
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return new Response(
          JSON.stringify({ error: 'INVALID_QUANTITY', message: `Item ${item.productId} must have a positive integer quantity` }),
          { status: 400, headers: responseHeaders(req) }
        );
      }
      const front = Array.isArray(item.frontPatches)
        ? item.frontPatches.map(extractPatchId).filter((id: string | null): id is string => id !== null)
        : [];
      const back = Array.isArray(item.backPatches)
        ? item.backPatches.map(extractPatchId).filter((id: string | null): id is string => id !== null)
        : [];

      validatedItems.push({
        productId: item.productId,
        quantity,
        frontPatches: front,
        backPatches: back,
      });
    }

    // d. Fetch products and patches from DB using admin client
    const productIds = validatedItems.map((i) => i.productId);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, base_price, quantity')
      .in('id', productIds);

    if (productsError) {
      console.error('Failed to fetch products:', productsError);
      return new Response(
        JSON.stringify({ error: 'PRODUCT_FETCH_FAILED', message: 'Failed to fetch product data' }),
        { status: 500, headers: responseHeaders(req) }
      );
    }

    const productMap = new Map((products || []).map((p: any) => [p.id, p]));

    // Collect unique patch IDs
    const patchIds: string[] = [];
    for (const item of validatedItems) {
      for (const pid of [...item.frontPatches, ...item.backPatches]) {
        if (!patchIds.includes(pid)) patchIds.push(pid);
      }
    }

    const patchMap = new Map<string, any>();
    if (patchIds.length > 0) {
      const { data: patches, error: patchesError } = await supabaseAdmin
        .from('patches')
        .select('id, name, price, quantity')
        .in('id', patchIds);

      if (patchesError) {
        console.error('Failed to fetch patches:', patchesError);
        return new Response(
          JSON.stringify({ error: 'PATCH_FETCH_FAILED', message: 'Failed to fetch patch data' }),
          { status: 500, headers: responseHeaders(req) }
        );
      }

      for (const patch of patches || []) {
        patchMap.set(patch.id, patch);
      }
    }

    // e. Check inventory availability (group patch occurrences by ID)
    const insufficient: Array<{ id: string; name: string; requested: number; available: number; type: 'product' | 'patch' }> = [];
    for (const item of validatedItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        insufficient.push({ id: item.productId, name: 'Unknown Product', requested: item.quantity, available: 0, type: 'product' });
        continue;
      }
      if ((product.quantity ?? 0) < item.quantity) {
        insufficient.push({
          id: product.id,
          name: product.name,
          requested: item.quantity,
          available: product.quantity ?? 0,
          type: 'product',
        });
      }

      const allPatchIds = [...item.frontPatches, ...item.backPatches];
      const patchCounts = allPatchIds.reduce((acc, pid) => {
        acc[pid] = (acc[pid] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>);

      for (const [patchId, requested] of Object.entries(patchCounts)) {
        const patch = patchMap.get(patchId);
        if (!patch) {
          insufficient.push({ id: patchId, name: 'Unknown Patch', requested, available: 0, type: 'patch' });
          continue;
        }
        if ((patch.quantity ?? 0) < requested) {
          insufficient.push({
            id: patch.id,
            name: patch.name,
            requested,
            available: patch.quantity ?? 0,
            type: 'patch',
          });
        }
      }
    }

    if (insufficient.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'INSUFFICIENT_INVENTORY',
          message: 'Some requested items are out of stock',
          items: insufficient,
        }),
        { status: 400, headers: responseHeaders(req) }
      );
    }

    // f. Calculate total in SGD (base currency), convert to target, then Stripe units
    let totalSgd = 0;
    for (const item of validatedItems) {
      const product = productMap.get(item.productId)!;
      const patchPrice = [...item.frontPatches, ...item.backPatches]
        .reduce((sum: number, pid: string) => sum + (patchMap.get(pid)?.price ?? 0), 0);
      totalSgd += (product.base_price + patchPrice) * item.quantity;
    }

    const targetCurrency = currency.toLowerCase();
    const exchangeRate = await fetchExchangeRate(targetCurrency);
    const convertedTotal = totalSgd * exchangeRate;
    const stripeAmount = toStripeAmount(targetCurrency, convertedTotal);

    // g. Reuse existing PaymentIntent if user has a pending order from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingPendingOrders } = await supabaseAdmin
      .from('pending_orders')
      .select('id, order_number, payment_intent_id, total_amount, status, updated_at')
      .eq('user_id', user.id)
      .eq('status', 'pending_payment')
      .not('payment_intent_id', 'is', null)
      .gte('updated_at', fiveMinutesAgo)
      .order('updated_at', { ascending: false })
      .limit(1);

    const existingPending = existingPendingOrders?.[0];
    if (existingPending?.payment_intent_id) {
      try {
        const existingPI = await stripe.paymentIntents.retrieve(existingPending.payment_intent_id);
        if (existingPI.status === 'requires_payment_method' && existingPI.currency === targetCurrency) {
          console.log('Reusing existing PaymentIntent:', existingPI.id);
          return new Response(
            JSON.stringify({
              clientSecret: existingPI.client_secret,
              paymentIntentId: existingPI.id,
              pendingOrderId: existingPending.id,
              orderNumber: existingPending.order_number,
              amount: existingPending.total_amount ?? totalSgd,
              stripeAmount: existingPI.amount,
              currency: existingPI.currency,
              reused: true,
            }),
            { status: 200, headers: responseHeaders(req) }
          );
        }
      } catch (e) {
        console.log('Existing PI invalid, creating new one');
      }
    }

    // h. Create pending order record before creating the PaymentIntent
    const orderNumber = generateOrderNumber();
    const shippingAddress = mapShippingAddress(shipping);
    const customerName = body.customer_name || shipping?.name || '';

    const { data: pendingOrder, error: pendingOrderError } = await supabaseAdmin
      .from('pending_orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        customer_email: customer_email || '',
        customer_name: customerName,
        items: cartItems,
        total_amount: totalSgd,
        currency: targetCurrency,
        shipping_address: shippingAddress,
        shipping_country: shippingAddress?.country || '',
        status: 'pending_payment',
      })
      .select('id, order_number')
      .single();

    if (pendingOrderError || !pendingOrder) {
      console.error('Failed to create pending order:', pendingOrderError);
      return new Response(
        JSON.stringify({ error: 'PENDING_ORDER_CREATE_FAILED', message: 'Failed to create pending order' }),
        { status: 500, headers: responseHeaders(req) }
      );
    }

    const pendingOrderId = pendingOrder.id;

    // i. Create new PaymentIntent
    const metadata: Record<string, string> = {
      user_id: user.id,
      pending_order_id: pendingOrderId,
      order_number: orderNumber,
    };
    if (!idempotency_key) {
      metadata.created_at = new Date().toISOString();
    }

    const paymentIntentParams: any = {
      amount: stripeAmount,
      currency: targetCurrency,
      automatic_payment_methods: { enabled: true },
      metadata,
    };

    if (customer_email) paymentIntentParams.receipt_email = customer_email;
    if (shipping) paymentIntentParams.shipping = shipping;

    const createOptions: any = {};
    if (idempotency_key) {
      createOptions.idempotencyKey = idempotency_key;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, createOptions);

    // Link the PaymentIntent to the pending order
    const { error: updatePendingError } = await supabaseAdmin
      .from('pending_orders')
      .update({ payment_intent_id: paymentIntent.id, updated_at: new Date().toISOString() })
      .eq('id', pendingOrderId);

    if (updatePendingError) {
      console.error('Failed to update pending order with PaymentIntent ID:', updatePendingError);
    }

    // j. Return response
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        pendingOrderId,
        orderNumber,
        amount: totalSgd,
        stripeAmount: paymentIntent.amount,
        currency: paymentIntent.currency,
        reused: false,
      }),
      { status: 200, headers: responseHeaders(req) }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message: error.message }),
      { status: 500, headers: responseHeaders(req) }
    );
  }
});
