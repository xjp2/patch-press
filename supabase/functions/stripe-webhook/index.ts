import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@22.5.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2026-03-25.dahlia',
  httpClient: Stripe.createFetchHttpClient(),
  // Stripe on Deno/esm defaults to the global Web Crypto API; do not pass
  // a custom cryptoProvider here because Stripe.SubtleCryptoProvider is
  // not exported in this build and crashes the function on boot.
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw']);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const ORDER_EMAIL_FROM = 'Patchuu <noreply@contact.patchuu.shop>';

function formatMoney(currency: string, amount: number): string {
  const zeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase());
  return `${currency.toUpperCase()} ${zeroDecimal ? Math.round(amount).toLocaleString() : amount.toFixed(2)}`;
}

function escapeHtml(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

const SITE_URL = 'https://patchuu.shop';
const LOGO_URL = `${SITE_URL}/hero/patchuubg.png`;

function absoluteImageUrl(u: any): string {
  if (!u || typeof u !== 'string') return '';
  if (u.startsWith('http')) return u;
  return `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`;
}

async function getSocialLinks(): Promise<{ label: string; url: string }[]> {
  try {
    const { data } = await supabaseAdmin
      .from('site_content')
      .select('footer')
      .eq('id', 'current')
      .single();
    const f = data?.footer || {};
    return [
      { label: 'Instagram', url: f.instagramUrl },
      { label: 'Facebook', url: f.facebookUrl },
      { label: 'X', url: f.twitterUrl },
    ].filter((l) => typeof l.url === 'string' && l.url.startsWith('http'));
  } catch {
    return [];
  }
}

function buildOrderEmailHtml(order: any, socialLinks: { label: string; url: string }[]): string {
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const shipping = order.shipping_address || {};
  const itemRows = items.map((item: any) => {
    const patchNames = (item.patches || []).filter(Boolean).map(escapeHtml).join(', ');
    const thumb = absoluteImageUrl(item.productImage);
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;">
          <table style="border-collapse:collapse;"><tr>
            ${thumb ? `<td style="padding-right:12px;vertical-align:middle;"><img src="${escapeHtml(thumb)}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;object-fit:contain;border-radius:10px;background:#f7f5f0;"></td>` : ''}
            <td style="vertical-align:middle;">
              <div style="font-weight:600;color:#333;">${escapeHtml(item.name)}</div>
              ${patchNames ? `<div style="font-size:13px;color:#777;margin-top:4px;">Patches: ${patchNames}</div>` : ''}
            </td>
          </tr></table>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:center;color:#555;vertical-align:middle;">${item.qty}</td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;color:#333;vertical-align:middle;">${formatMoney(order.currency, Number(item.price))}</td>
      </tr>`;
  }).join('');

  const addressLines = [
    shipping.name,
    shipping.address_line1,
    shipping.address_line2,
    [shipping.city, shipping.state, shipping.postal_code].filter(Boolean).join(' '),
    shipping.country,
  ].filter(Boolean).map(escapeHtml).join('<br>');

  const footerLinks = [
    { label: 'Shop', url: SITE_URL },
    { label: 'Terms of Service', url: `${SITE_URL}/terms` },
    { label: 'Refund Policy', url: `${SITE_URL}/refund` },
    { label: 'Privacy Policy', url: `${SITE_URL}/privacy` },
    { label: 'Shipping Policy', url: `${SITE_URL}/shipping` },
  ].map((l) => `<a href="${l.url}" style="color:#2f7d5f;text-decoration:none;font-size:12px;">${l.label}</a>`).join('<span style="color:#ddd;padding:0 6px;">·</span>');

  const socialRow = socialLinks.length > 0
    ? `<div style="margin-top:14px;">${socialLinks.map((s) => `<a href="${escapeHtml(s.url)}" style="display:inline-block;background:#f0f7f3;color:#2f7d5f;font-size:12px;font-weight:600;text-decoration:none;padding:6px 14px;border-radius:999px;margin:0 4px;">${s.label}</a>`).join('')}</div>`
    : '';

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f7f5f0;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${LOGO_URL}" width="170" alt="Patchuu" style="display:inline-block;width:170px;height:auto;">
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #eee;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#2f7d5f;text-align:center;">Thank you for your order!</h1>
      <p style="margin:0 0 24px;color:#666;font-size:14px;text-align:center;">
        Hi ${escapeHtml(order.customer_name || 'there')}, we've received your payment and we're getting your order ready.
      </p>
      <div style="background:#f0f7f3;border-radius:10px;padding:12px 16px;margin-bottom:24px;text-align:center;">
        <span style="font-size:13px;color:#666;">Order number</span><br>
        <span style="font-size:16px;font-weight:700;color:#2f7d5f;">${escapeHtml(order.order_number)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="color:#999;font-size:12px;text-transform:uppercase;">
          <td style="padding-bottom:8px;">Item</td>
          <td style="padding-bottom:8px;text-align:center;">Qty</td>
          <td style="padding-bottom:8px;text-align:right;">Price</td>
        </tr>
        ${itemRows}
        <tr>
          <td colspan="2" style="padding-top:14px;font-weight:700;color:#333;">Total</td>
          <td style="padding-top:14px;text-align:right;font-weight:700;color:#333;">${formatMoney(order.currency, Number(order.total_amount))}</td>
        </tr>
      </table>
      ${addressLines ? `
      <h2 style="font-size:15px;color:#333;margin:28px 0 8px;">Shipping to</h2>
      <p style="margin:0;color:#666;font-size:14px;line-height:1.5;">${addressLines}</p>` : ''}
      <p style="margin:28px 0 0;color:#999;font-size:12px;text-align:center;">
        If anything looks wrong with your order, just reply to this email.
      </p>
    </div>
    <div style="text-align:center;margin-top:20px;">
      <div>${footerLinks}</div>
      ${socialRow}
      <p style="color:#bbb;font-size:12px;margin-top:14px;">© ${new Date().getFullYear()} Patchuu. Made with love in Seoul.</p>
    </div>
  </div>
</body></html>`;
}

async function sendOrderConfirmationEmail(order: any) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set; skipping order confirmation email');
    return;
  }
  if (!order.customer_email) {
    console.warn('Order has no customer email; skipping confirmation:', order.id);
    return;
  }

  const socialLinks = await getSocialLinks();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: ORDER_EMAIL_FROM,
      to: [order.customer_email],
      subject: `Order confirmed — ${order.order_number}`,
      html: buildOrderEmailHtml(order, socialLinks),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API ${res.status}: ${text}`);
  }
  console.log('Order confirmation email sent to', order.customer_email);
}

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
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

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

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);

  const metadata = session.metadata || {};
  const pendingOrderId = metadata.pending_order_id;

  // Find pending order by checkout_session_id first, then by pending_order_id
  let pendingOrder: any = null;
  if (session.id) {
    const { data, error } = await supabaseAdmin
      .from('pending_orders')
      .select('*')
      .eq('checkout_session_id', session.id)
      .maybeSingle();
    if (error) {
      console.error('Error fetching pending order by checkout_session_id:', error);
    }
    pendingOrder = data;
  }

  if (!pendingOrder && pendingOrderId) {
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

  if (!pendingOrder) {
    console.warn('No pending order found for checkout session:', session.id);
    return;
  }

  if (pendingOrder.status === 'completed') {
    console.log('Pending order already completed, idempotent skip:', pendingOrder.id);
    return;
  }

  const paymentIntent = typeof session.payment_intent === 'string'
    ? null
    : session.payment_intent;

  if (!paymentIntent) {
    console.warn('Checkout session completed without expanded payment intent:', session.id);
    return;
  }

  // Ensure the pending order has the payment_intent_id for future lookups
  if (!pendingOrder.payment_intent_id && paymentIntent.id) {
    await supabaseAdmin
      .from('pending_orders')
      .update({
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingOrder.id);
  }

  // Reuse the existing fulfillment path with a PaymentIntent-shaped object
  const piLike: any = {
    id: paymentIntent.id,
    currency: paymentIntent.currency || session.currency,
    amount: paymentIntent.amount || session.amount_total,
    metadata: { ...metadata, pending_order_id: pendingOrder.id },
    receipt_email: session.customer_details?.email || paymentIntent.receipt_email || '',
    shipping: session.shipping_details || paymentIntent.shipping,
  };

  await handlePaymentIntentSucceeded(piLike as Stripe.PaymentIntent);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  const metadata = paymentIntent.metadata || {};
  const pendingOrderId = metadata.pending_order_id;

  // Find pending order by id, payment_intent_id, or checkout_session_id
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

  if (!pendingOrder && metadata.checkout_session_id) {
    const { data, error } = await supabaseAdmin
      .from('pending_orders')
      .select('*')
      .eq('checkout_session_id', metadata.checkout_session_id)
      .maybeSingle();
    if (error) {
      console.error('Error fetching pending order by checkout_session_id:', error);
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
    .select('*')
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

  // Mark order as paid and pending order as completed. The conditional update
  // doubles as an idempotency gate: concurrent/duplicate webhook deliveries
  // serialize on the row lock, so only the one that flips status to 'paid'
  // gets rows back — and only that one sends the confirmation email.
  const { data: paidRows } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'paid',
      payment_verified: true,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .neq('status', 'paid')
    .select('id');
  const justMarkedPaid = (paidRows?.length || 0) > 0;

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

  // Send the order confirmation email (best-effort — never fail the webhook over email)
  if (justMarkedPaid) {
    try {
      await sendOrderConfirmationEmail({ ...order, order_number: pendingOrder.order_number });
    } catch (emailErr) {
      console.error('Failed to send order confirmation email:', emailErr);
    }
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
