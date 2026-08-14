import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@22.5.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2026-03-25.dahlia',
  httpClient: Stripe.createFetchHttpClient(),
  cryptoProvider: new Stripe.SubtleCryptoProvider(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

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
    'Content-Type': 'application/json',
  };
}

function fromStripeAmount(currency: string, amount: number): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return amount;
  }
  return amount / 100;
}

function convertToCurrency(amount: number, currency: string, rate: number): number {
  const converted = amount * rate;
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return Math.round(converted);
  }
  return Math.round(converted * 100) / 100;
}

function buildInventoryPayload(items: any[]): any[] {
  return items.map((item: any) => {
    const patchCounts: Record<string, number> = {};
    for (const p of [...(item.frontPatches || []), ...(item.backPatches || [])]) {
      if (p?.id) {
        patchCounts[p.id] = (patchCounts[p.id] || 0) + 1;
      }
    }
    return {
      productId: item.productId,
      quantity: item.quantity || 1,
      patchCounts,
    };
  });
}

function buildOrderItemsJson(items: any[], currency: string, rate: number): any[] {
  return items.map((item: any) => ({
    name: item.productName,
    qty: item.quantity,
    price: convertToCurrency(item.totalPrice, currency, rate),
    basePrice: convertToCurrency(item.basePrice, currency, rate),
    patches: [...(item.frontPatches || []), ...(item.backPatches || [])].map((p: any) => p.name),
    productImage: item.productImage,
    productBackImage: item.productBackImage,
    placementZone: item.placementZone,
    productWidth: item.width,
    productHeight: item.height,
    frontPatches: (item.frontPatches || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.image,
      price: convertToCurrency(p.price, currency, rate),
      x: p.x,
      y: p.y,
      rotation: p.rotation,
      widthPercent: p.widthPercent,
      heightPercent: p.heightPercent,
      contentZone: p.contentZone,
    })),
    backPatches: (item.backPatches || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.image,
      price: convertToCurrency(p.price, currency, rate),
      x: p.x,
      y: p.y,
      rotation: p.rotation,
      widthPercent: p.widthPercent,
      heightPercent: p.heightPercent,
      contentZone: p.contentZone,
    })),
  }));
}

function buildOrderItemsRows(items: any[], currency: string, rate: number): any[] {
  return items.map((item: any) => ({
    product_id: item.productId,
    patches: [...(item.frontPatches || []), ...(item.backPatches || [])].map((p: any) => p.id),
    design_image_url: item.productImage,
    quantity: item.quantity || 1,
    unit_price: convertToCurrency(item.basePrice, currency, rate),
    total_price: convertToCurrency(item.totalPrice, currency, rate),
  }));
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
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: responseHeaders(req) }
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
        { status: 400, headers: responseHeaders(req) }
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
      { status: 200, headers: responseHeaders(req) }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: responseHeaders(req) }
    );
  }
});

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  const metadata = paymentIntent.metadata || {};
  const pendingOrderId = metadata.pending_order_id;

  // Find pending order by id or by payment_intent_id
  let pendingOrder: any = null;
  if (pendingOrderId) {
    const { data, error } = await supabaseAdmin
      .from('pending_orders')
      .select('*')
      .eq('id', pendingOrderId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching pending order by id:', error);
    }
    pendingOrder = data;
  }

  if (!pendingOrder && paymentIntent.id) {
    const { data, error } = await supabaseAdmin
      .from('pending_orders')
      .select('*')
      .eq('payment_intent_id', paymentIntent.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Error fetching pending order by payment_intent_id:', error);
    }
    pendingOrder = data;
  }

  if (!pendingOrder) {
    console.warn('No pending order found for payment intent:', paymentIntent.id);
    return;
  }

  if (pendingOrder.status === 'completed') {
    console.log('Pending order already completed, idempotent skip:', pendingOrder.id);
    return;
  }

  const currency = (pendingOrder.currency || paymentIntent.currency).toLowerCase();
  const stripeAmount = fromStripeAmount(paymentIntent.currency, paymentIntent.amount);
  const sgdTotal = Number(pendingOrder.total_amount);
  const exchangeRate = sgdTotal > 0 ? stripeAmount / sgdTotal : 1;

  // Check for an existing order record for this PaymentIntent
  const { data: existingOrders } = await supabaseAdmin
    .from('orders')
    .select('id, status, total_amount')
    .eq('payment_intent_id', paymentIntent.id)
    .order('created_at', { ascending: false })
    .limit(1);
  const existingOrder = existingOrders?.[0] || null;

  if (existingOrder) {
    if (existingOrder.status === 'paid') {
      await supabaseAdmin
        .from('pending_orders')
        .update({
          status: 'completed',
          payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pendingOrder.id);
      console.log('Existing order already paid, marked pending order completed:', existingOrder.id);
      return;
    }
    if (existingOrder.status === 'amount_mismatch') {
      console.log('Existing order has amount mismatch, skipping:', existingOrder.id);
      return;
    }
  }

  // Create the order if it does not yet exist
  let order: any = existingOrder;
  if (!order) {
    const shipping = paymentIntent.shipping;
    const shippingAddress = shipping
      ? mapShippingAddress(shipping)
      : pendingOrder.shipping_address;
    const orderItemsJson = buildOrderItemsJson(pendingOrder.items, currency, exchangeRate);

    const { data: newOrder, error: createOrderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: pendingOrder.order_number,
        payment_intent_id: paymentIntent.id,
        customer_email: pendingOrder.customer_email || paymentIntent.receipt_email || '',
        customer_name: shipping?.name || pendingOrder.customer_name || '',
        items: orderItemsJson,
        total_amount: stripeAmount,
        currency,
        shipping_address: shippingAddress,
        shipping_country: shippingAddress?.country || '',
        user_id: pendingOrder.user_id,
        status: 'pending',
        payment_verified: false,
        fulfillment_status: 'pending',
      })
      .select()
      .single();

    if (createOrderError || !newOrder) {
      console.error('Failed to create order:', createOrderError);
      throw createOrderError || new Error('ORDER_CREATE_FAILED');
    }

    order = newOrder;

    // Create order_items rows
    const orderItemsRows = buildOrderItemsRows(pendingOrder.items, currency, exchangeRate);
    if (orderItemsRows.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItemsRows.map((row) => ({ ...row, order_id: order.id })));
      if (itemsError) {
        console.error('Failed to create order items:', itemsError);
      }
    }
  }

  // Validate amount matches the charged amount (with small rounding tolerance)
  const orderAmount = Number(order.total_amount);
  const tolerance = 0.01;
  if (Math.abs(stripeAmount - orderAmount) > tolerance) {
    console.error(`AMOUNT MISMATCH! Order: ${orderAmount}, Stripe: ${stripeAmount}`);
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'amount_mismatch',
        payment_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);
    await supabaseAdmin
      .from('pending_orders')
      .update({
        status: 'amount_mismatch',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingOrder.id);
    return;
  }

  // Deduct inventory atomically
  const inventoryPayload = buildInventoryPayload(pendingOrder.items);
  const { data: deductResult, error: deductError } = await supabaseAdmin.rpc(
    'deduct_inventory_for_order',
    {
      order_items: inventoryPayload,
      order_id: order.id,
    }
  );

  if (deductError || !deductResult?.success) {
    console.error('Inventory deduction failed:', deductError || deductResult);
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'inventory_failed',
        payment_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);
    await supabaseAdmin
      .from('pending_orders')
      .update({
        status: 'inventory_failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingOrder.id);
    return;
  }

  // Mark order as paid and pending order as completed
  await supabaseAdmin
    .from('orders')
    .update({
      status: 'paid',
      payment_verified: true,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  await supabaseAdmin
    .from('pending_orders')
    .update({
      status: 'completed',
      payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pendingOrder.id);

  // Clear the user's cart
  if (pendingOrder.user_id) {
    await supabaseAdmin.from('cart_items').delete().eq('user_id', pendingOrder.user_id);
  }

  console.log('Order fulfilled:', order.id, 'Order #:', pendingOrder.order_number);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);

  const lastError = paymentIntent.last_payment_error;
  console.error('Payment error:', lastError?.message);

  // Update pending order status if one exists
  if (paymentIntent.id) {
    const { data: pendingOrders } = await supabaseAdmin
      .from('pending_orders')
      .select('id')
      .eq('payment_intent_id', paymentIntent.id)
      .limit(1);
    if (pendingOrders?.[0]) {
      await supabaseAdmin
        .from('pending_orders')
        .update({ status: 'payment_failed', updated_at: new Date().toISOString() })
        .eq('id', pendingOrders[0].id);
    }
  }

  // Log failed payment for analytics
  try {
    const stripeAmount = fromStripeAmount(paymentIntent.currency, paymentIntent.amount);

    await supabaseAdmin
      .from('payment_logs')
      .insert({
        payment_intent_id: paymentIntent.id,
        status: 'failed',
        error_message: lastError?.message || 'Unknown error',
        amount: stripeAmount,
        currency: paymentIntent.currency,
        created_at: new Date().toISOString(),
      });
  } catch (e) {
    // Table might not exist, ignore
    console.log('Could not log payment failure:', e);
  }
}
