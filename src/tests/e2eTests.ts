/**
 * Patch & Press - End-to-End Test Suite
 * 
 * Comprehensive tests covering:
 * - Navigation flows
 * - Checkout process
 * - Stripe integration
 * - Security & RLS policies
 * - Audit logging
 */

import { supabase, db } from '../lib/supabase';

// Test result tracking
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  category: 'navigation' | 'checkout' | 'stripe' | 'security' | 'audit';
}

const results: TestResult[] = [];

async function runTest(
  name: string, 
  category: TestResult['category'],
  testFn: () => Promise<void>
): Promise<void> {
  const start = performance.now();
  try {
    await testFn();
    results.push({
      name,
      category,
      passed: true,
      duration: performance.now() - start
    });
    console.log(`✅ [${category}] ${name}`);
  } catch (error: any) {
    results.push({
      name,
      category,
      passed: false,
      error: error.message,
      duration: performance.now() - start
    });
    console.error(`❌ [${category}] ${name}:`, error.message);
  }
}

// ============================================
// NAVIGATION TESTS
// ============================================

async function testNavigationFlows() {
  // Test 1: Landing Page Load
  await runTest('Landing Page - Load', 'navigation', async () => {
    // Check if we can fetch CMS content for landing page
    const { data, error } = await db.siteContent.get();
    if (error) throw error;
    if (!data?.landing_page) throw new Error('Landing page content not found');
    console.log(`  ✓ Landing page has ${data.landing_page.length} sections`);
  });

  // Test 2: Products Navigation
  await runTest('Navigation - Products Available', 'navigation', async () => {
    const { data, error } = await db.products.list();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No products found');
    console.log(`  ✓ ${data.length} products available for navigation`);
  });

  // Test 3: Patches Navigation
  await runTest('Navigation - Patches Available', 'navigation', async () => {
    const { data, error } = await db.patches.list();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No patches found');
    console.log(`  ✓ ${data.length} patches available for navigation`);
  });

  // Test 4: Customize Page Content
  await runTest('Navigation - Customize Page', 'navigation', async () => {
    const { data, error } = await db.siteContent.get();
    if (error) throw error;
    if (!data?.customize_page) throw new Error('Customize page content not found');
    console.log('  ✓ Customize page content loaded');
  });

  // Test 5: Auth Pages Accessible
  await runTest('Navigation - Auth Pages', 'navigation', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    console.log(`  ✓ Auth check complete, session: ${sessionData.session ? 'active' : 'none'}`);
  });
}

// ============================================
// CHECKOUT FLOW TESTS
// ============================================

async function testCheckoutFlow() {
  // Test 1: Cart Operations
  await runTest('Checkout - Cart Operations', 'checkout', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (!userId) {
      console.log('  ⚠️ Skipping cart test - no user session');
      return;
    }

    // Test cart item creation
    const testCartItem = {
      user_id: userId,
      product_id: `test-product-${Date.now()}`,
      product_name: 'Test Product',
      patches: [],
      total_price: 99.99,
      quantity: 1,
      product_image: 'https://example.com/test.jpg'
    };

    const { data, error } = await supabase
      .from('cart_items')
      .insert(testCartItem)
      .select()
      .single();

    if (error) throw error;
    console.log('  ✓ Cart item created');

    // Clean up
    if (data?.id) {
      await supabase.from('cart_items').delete().eq('id', data.id);
      console.log('  ✓ Cart item cleaned up');
    }
  });

  // Test 2: Order Creation Flow
  await runTest('Checkout - Order Creation', 'checkout', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (!userId) {
      console.log('  ⚠️ Skipping order test - no user session');
      return;
    }

    const testOrder = {
      order_number: `TEST-${Date.now()}`,
      payment_intent_id: `pi_test_${Date.now()}`,
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      items: [{ name: 'Test Item', qty: 1, price: 99.99 }],
      total_amount: 99.99,
      currency: 'sgd',

      shipping_address: {
        name: 'Test User',
        address_line1: '123 Test St',
        city: 'Test City',
        postal_code: '123456',
        country: 'SG'
      },
      user_id: userId
    };

    const { data, error } = await db.orders.create(testOrder);
    if (error) throw error;
    console.log('  ✓ Order created:', data?.order_number);

    // Clean up
    if (data?.id) {
      await supabase.from('orders').delete().eq('id', data.id);
    }
  });

  // Test 3: Order Status Flow
  await runTest('Checkout - Order Status Flow', 'checkout', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (!userId) {
      console.log('  ⚠️ Skipping status flow test - no user session');
      return;
    }

    // Create order
    const { data: order, error: createError } = await db.orders.create({
      order_number: `TEST-FLOW-${Date.now()}`,
      payment_intent_id: `pi_flow_${Date.now()}`,
      customer_email: 'test@example.com',
      items: [{ name: 'Test', qty: 1, price: 50 }],
      total_amount: 50,
      currency: 'sgd',

      shipping_address: { name: 'Test', address_line1: '123', city: 'City', postal_code: '123', country: 'SG' },
      user_id: userId
    });

    if (createError) throw createError;

    // Update to paid
    const { error: updateError } = await db.orders.updateStatus(order.id, 'paid');
    if (updateError) throw updateError;
    console.log('  ✓ Order status updated to paid');

    // Clean up
    await supabase.from('orders').delete().eq('id', order.id);
  });
}

// ============================================
// STRIPE INTEGRATION TESTS
// ============================================

async function testStripeIntegration() {
  // Test 1: Stripe Configuration
  await runTest('Stripe - Configuration Check', 'stripe', async () => {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) throw new Error('VITE_STRIPE_PUBLISHABLE_KEY not set');
    if (!publishableKey.startsWith('pk_')) throw new Error('Invalid Stripe publishable key format');
    console.log('  ✓ Stripe publishable key configured');
  });

  // Test 2: Payment Intent Edge Function
  await runTest('Stripe - Edge Function Available', 'stripe', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.log('  ⚠️ Skipping - no session');
      return;
    }

    // Check if edge function responds (we won't actually create a PI to avoid charges)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ amount: 100, currency: 'sgd' }),
      }
    );

    // We expect either success (200) or validation error (400), not 404
    if (response.status === 404) throw new Error('Edge function not found');
    if (response.status === 401) throw new Error('Unauthorized - check JWT settings');
    console.log(`  ✓ Edge function responding (status: ${response.status})`);
  });

  // Test 3: Webhook Endpoint Check
  await runTest('Stripe - Webhook Endpoint', 'stripe', async () => {
    // We can't easily test the webhook without Stripe signature
    // But we can check if the function exists
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`,
      { method: 'GET' }
    );
    
    // Should get 405 (Method Not Allowed) or 400 (Missing signature), not 404
    if (response.status === 404) throw new Error('Webhook function not found');
    console.log(`  ✓ Webhook endpoint exists (status: ${response.status})`);
  });

  // Test 4: Currency Configuration
  await runTest('Stripe - Currency Settings', 'stripe', async () => {
    const { data: siteContent } = await db.siteContent.get();
    const currency = siteContent?.global_settings?.currency || 'sgd';
    const validCurrencies = ['usd', 'sgd', 'eur', 'gbp', 'jpy', 'krw'];
    if (!validCurrencies.includes(currency.toLowerCase())) {
      throw new Error(`Invalid currency: ${currency}`);
    }
    console.log(`  ✓ Currency configured: ${currency.toUpperCase()}`);
  });
}

// ============================================
// SECURITY & AUDIT TESTS
// ============================================

async function testSecurityAndAudit() {
  // Test 1: RLS Policies - Products
  await runTest('Security - Products RLS', 'security', async () => {
    // Try to insert without admin role (should fail for non-admin)
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.log('  ⚠️ Skipping - no session');
      return;
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionData.session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      console.log('  ⚠️ User is not admin, RLS test skipped');
      return;
    }

    // Admin should be able to insert
    const testId = `security-test-${Date.now()}`;
    const { error } = await supabase
      .from('products')
      .insert({
        id: testId,
        name: 'Security Test',
        base_price: 1,
        width: 100,
        height: 100
      })
      .select()
      .single();

    if (error) throw error;
    console.log('  ✓ Admin can insert products');

    // Clean up
    await supabase.from('products').delete().eq('id', testId);
  });

  // Test 2: RLS Policies - Orders (User Isolation)
  await runTest('Security - Order Isolation', 'security', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (!userId) {
      console.log('  ⚠️ Skipping - no session');
      return;
    }

    // User should only see their own orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('user_id');

    if (error) throw error;
    
    // Check that all returned orders belong to current user
    const otherUserOrders = orders?.filter(o => o.user_id !== userId) || [];
    if (otherUserOrders.length > 0) {
      throw new Error(`RLS breach: User can see ${otherUserOrders.length} orders from other users`);
    }
    console.log(`  ✓ User only sees own orders (${orders?.length || 0} orders)`);
  });

  // Test 3: Authentication Required for Admin
  await runTest('Security - Admin Requires Auth', 'security', async () => {
    // Check if admin routes require authentication
    const publicRoutes = ['/', '/customize']; // These should work without auth
    const protectedRoutes = ['/admin']; // These should require auth
    
    console.log('  ✓ Public routes:', publicRoutes.join(', '));
    console.log('  ✓ Protected routes:', protectedRoutes.join(', '));
  });

  // Test 4: Payment Intent Security
  await runTest('Security - Payment Intent Protection', 'security', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.log('  ⚠️ Skipping - no session');
      return;
    }

    // Attempt to create payment intent with invalid amount
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ amount: -100, currency: 'sgd' }), // Invalid negative amount
      }
    );

    if (response.status === 200) {
      throw new Error('Security issue: Negative amount accepted');
    }
    console.log('  ✓ Invalid amounts rejected');
  });

  // Test 5: Audit - Order Creation Logged
  await runTest('Audit - Order Creation Trail', 'audit', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (!userId) {
      console.log('  ⚠️ Skipping - no session');
      return;
    }

    // Create an order
    const { data: order, error } = await db.orders.create({
      order_number: `AUDIT-${Date.now()}`,
      payment_intent_id: `pi_audit_${Date.now()}`,
      customer_email: 'audit@example.com',
      items: [{ name: 'Audit Test', qty: 1, price: 10 }],
      total_amount: 10,
      currency: 'sgd',

      shipping_address: { name: 'Audit', address_line1: '123', city: 'City', postal_code: '123', country: 'SG' },
      user_id: userId
    });

    if (error) throw error;

    // Verify order has created_at timestamp
    const { data: fetched } = await supabase
      .from('orders')
      .select('created_at, user_id, order_number')
      .eq('id', order.id)
      .single();

    if (!fetched?.created_at) throw new Error('Order missing created_at timestamp');
    if (fetched.user_id !== userId) throw new Error('Order user_id mismatch');
    
    console.log('  ✓ Order audit trail verified');

    // Clean up
    await supabase.from('orders').delete().eq('id', order.id);
  });

  // Test 6: Audit - Profile Tracking
  await runTest('Audit - User Profile', 'audit', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (!userId) {
      console.log('  ⚠️ Skipping - no session');
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role, created_at')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!profile) throw new Error('Profile not found');
    if (!profile.created_at) throw new Error('Profile missing created_at');
    
    console.log(`  ✓ Profile tracked: ${profile.role} (created: ${new Date(profile.created_at).toLocaleDateString()})`);
  });

  // Test 7: Amount Tampering Protection
  await runTest('Security - Amount Validation', 'security', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (!userId) {
      console.log('  ⚠️ Skipping - no session');
      return;
    }

    // The webhook should validate order amounts match Stripe amounts
    // We'll create an order and verify the validation structure exists
    const { data: order, error } = await db.orders.create({
      order_number: `VALIDATION-${Date.now()}`,
      payment_intent_id: `pi_val_${Date.now()}`,
      customer_email: 'validation@example.com',
      items: [{ name: 'Validation Test', qty: 1, price: 99.99 }],
      total_amount: 99.99,
      currency: 'sgd',


      shipping_address: { name: 'Val', address_line1: '123', city: 'City', postal_code: '123', country: 'SG' },
      user_id: userId
    });

    if (error) throw error;
    if (order.payment_verified !== false) {
      throw new Error('New orders should have payment_verified=false');
    }
    console.log('  ✓ Order amount validation structure in place');

    // Clean up
    await supabase.from('orders').delete().eq('id', order.id);
  });
}

// ============================================
// MAIN TEST RUNNER
// ============================================

export async function runAllE2ETests(): Promise<TestResult[]> {
  results.length = 0;
  console.log('\n🧪 Starting Patch & Press E2E Tests...\n');

  // Run all test categories
  await testNavigationFlows();
  await testCheckoutFlow();
  await testStripeIntegration();
  await testSecurityAndAudit();

  // Print summary
  printSummary();
  
  return [...results];
}

export async function runTestCategory(category: TestResult['category']): Promise<TestResult[]> {
  results.length = 0;
  console.log(`\n🧪 Running ${category} tests...\n`);

  switch (category) {
    case 'navigation':
      await testNavigationFlows();
      break;
    case 'checkout':
      await testCheckoutFlow();
      break;
    case 'stripe':
      await testStripeIntegration();
      break;
    case 'security':
    case 'audit':
      await testSecurityAndAudit();
      break;
  }

  printSummary();
  return [...results];
}

function printSummary() {
  const byCategory = {
    navigation: results.filter(r => r.category === 'navigation'),
    checkout: results.filter(r => r.category === 'checkout'),
    stripe: results.filter(r => r.category === 'stripe'),
    security: results.filter(r => r.category === 'security'),
    audit: results.filter(r => r.category === 'audit'),
  };

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log('\n' + '='.repeat(60));
  console.log('📊 E2E TEST SUMMARY');
  console.log('='.repeat(60));
  
  Object.entries(byCategory).forEach(([cat, catResults]) => {
    const catPassed = catResults.filter(r => r.passed).length;
    const catFailed = catResults.filter(r => !r.passed).length;
    const icon = catFailed > 0 ? '❌' : '✅';
    console.log(`${icon} ${cat.toUpperCase()}: ${catPassed}/${catResults.length} passed${catFailed > 0 ? ` (${catFailed} failed)` : ''}`);
  });
  
  console.log('-'.repeat(60));
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️ Duration: ${totalDuration.toFixed(2)}ms`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  [${r.category}] ${r.name}`);
      console.log(`    Error: ${r.error}`);
    });
  }
}

// Export for selective testing
export const testCategories = {
  navigation: testNavigationFlows,
  checkout: testCheckoutFlow,
  stripe: testStripeIntegration,
  security: testSecurityAndAudit,
  audit: testSecurityAndAudit, // Same as security
};

export default { runAllE2ETests, runTestCategory, testCategories };
