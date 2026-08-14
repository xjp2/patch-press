import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';

function toFormEncoded(obj: any, prefix = ''): string[] {
  const pairs: string[] = [];
  for (const key in obj) {
    const value = obj[key];
    if (value === undefined || value === null) continue;
    const newKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          pairs.push(...toFormEncoded(item, `${newKey}[${index}]`));
        } else {
          pairs.push(`${encodeURIComponent(`${newKey}[${index}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      pairs.push(...toFormEncoded(value, newKey));
    } else {
      pairs.push(`${encodeURIComponent(newKey)}=${encodeURIComponent(String(value))}`);
    }
  }
  return pairs;
}

async function stripeApiFetch(path: string, body: any): Promise<any> {
  const formBody = toFormEncoded(body).join('&');
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2026-03-25.dahlia',
    },
    body: formBody,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Stripe API error ${res.status}`;
    throw new Error(message);
  }
  return data;
}

const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw']);

// FX buffer applied to non-SGD charges: covers Stripe's settlement currency
// conversion fee (~1-2%) so the conversion cost is carried by the displayed
// foreign-currency price rather than the merchant margin.
const FX_BUFFER = 1.02;

// Presentment currencies the storefront selector offers; all are
// Stripe-supported charge currencies. Anything else falls back to SGD.
const SUPPORTED_CHARGE_CURRENCIES = new Set(['sgd', 'usd', 'eur', 'gbp', 'jpy', 'krw']);

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
    const { cartItems, currency = 'sgd', customer_email, shipping, return_url } = body;

    // Charge in the customer-selected display currency (display = charge).
    // Unsupported values fall back to the SGD settlement currency.
    const requestedCurrency = String(currency || 'sgd').toLowerCase();
    const selectableCurrency = SUPPORTED_CHARGE_CURRENCIES.has(requestedCurrency)
      ? requestedCurrency
      : 'sgd';

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

    // f. Calculate totals in SGD (base/merchant currency)
    let totalSgd = 0;
    for (const item of validatedItems) {
      const product = productMap.get(item.productId)!;
      const patchPrice = [...item.frontPatches, ...item.backPatches]
        .reduce((sum: number, pid: string) => sum + (patchMap.get(pid)?.price ?? 0), 0);
      totalSgd += (product.base_price + patchPrice) * item.quantity;
    }

    // Charge in the customer's selected currency so the price displayed is
    // exactly the price charged (Stripe recommends always displaying the
    // Checkout Session's own amount and currency). Prices are converted from
    // the DB-trusted SGD base. If the exchange rate is unavailable, fall back
    // to charging SGD so checkout keeps working.
    let targetCurrency = selectableCurrency;
    let exchangeRate = 1;
    if (targetCurrency !== 'sgd') {
      try {
        exchangeRate = await fetchExchangeRate(targetCurrency);
      } catch {
        console.warn('Exchange rate unavailable, falling back to SGD charge');
        targetCurrency = 'sgd';
        exchangeRate = 1;
      }
    }

    // g. Build line items in the charge currency (per-unit, DB-trusted prices)
    const lineItems: any[] = [];
    let totalChargedMinor = 0;
    for (const item of validatedItems) {
      const product = productMap.get(item.productId)!;
      const patchPrice = [...item.frontPatches, ...item.backPatches]
        .reduce((sum: number, pid: string) => sum + (patchMap.get(pid)?.price ?? 0), 0);
      const unitPriceSgd = product.base_price + patchPrice;
      // FX buffer applies only to non-SGD charges (exchangeRate is 1 for SGD,
      // so guard on currency, not the rate).
      const unitAmount = toStripeAmount(
        targetCurrency,
        unitPriceSgd * exchangeRate * (targetCurrency === 'sgd' ? 1 : FX_BUFFER)
      );

      if (unitAmount <= 0) {
        continue;
      }
      totalChargedMinor += unitAmount * item.quantity;

      const allPatchNames = [...item.frontPatches, ...item.backPatches]
        .map((pid) => patchMap.get(pid)?.name)
        .filter(Boolean);

      lineItems.push({
        price_data: {
          currency: targetCurrency,
          unit_amount: unitAmount,
          product_data: {
            name: product.name || 'Product',
            description: allPatchNames.length > 0 ? `Patches: ${allPatchNames.join(', ')}` : undefined,
          },
        },
        quantity: item.quantity,
      });
    }

    if (lineItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'INVALID_CART', message: 'Could not build line items from cart' }),
        { status: 400, headers: responseHeaders(req) }
      );
    }

    // h. Create pending order record before creating the Checkout Session
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
        // total_amount stays in the SGD base currency; `currency` is the
        // charge currency. The webhook derives the implied exchange rate from
        // the actual Stripe-charged amount vs this SGD total.
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

    // i. Create Checkout Session with ui_mode: 'elements'
    const metadata: Record<string, string> = {
      user_id: user.id,
      pending_order_id: pendingOrderId,
      order_number: orderNumber,
    };

    const sessionPayload: any = {
      mode: 'payment',
      ui_mode: 'elements',
      currency: targetCurrency,
      line_items: lineItems,
      client_reference_id: orderNumber,
      customer_email: customer_email || undefined,
      invoice_creation: { enabled: true },
      payment_intent_data: {
        metadata,
        receipt_email: customer_email || undefined,
      },
      metadata,
      // Adaptive Pricing only applies when charging the settlement currency;
      // when the customer already picked their currency, honor it as-is.
      ...(targetCurrency === 'sgd' ? { adaptive_pricing: { enabled: true } } : {}),
      shipping_address_collection: {
        allowed_countries: ['SG', 'MY', 'ID', 'TH', 'PH', 'VN', 'US', 'GB', 'AU', 'JP', 'KR', 'CN', 'TW', 'HK'],
      },
      return_url: return_url || undefined,
    };

    const session = await stripeApiFetch('/checkout/sessions', sessionPayload);

    if (!session.client_secret) {
      console.error('Checkout Session created without client_secret:', session.id);
      return new Response(
        JSON.stringify({ error: 'SESSION_CREATE_FAILED', message: 'Failed to create checkout session' }),
        { status: 500, headers: responseHeaders(req) }
      );
    }

    // Store the Checkout Session ID on the pending order so the webhook can
    // reliably look it up even if PaymentIntent metadata is missing.
    await supabaseAdmin
      .from('pending_orders')
      .update({
        checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingOrderId);

    // j. Return response
    return new Response(
      JSON.stringify({
        clientSecret: session.client_secret,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        pendingOrderId,
        orderNumber,
        // Amount and currency the customer will actually be charged — the
        // frontend must display these, not its own conversion.
        amount: fromStripeAmount(targetCurrency, totalChargedMinor),
        stripeAmount: session.amount_total,
        currency: targetCurrency,
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
