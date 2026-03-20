/**
 * Patch & Press - Component Test Suite
 * 
 * This file contains comprehensive tests for all major components.
 * Run these tests in the browser console or integrate with Jest/Vitest.
 */

import { supabase, db } from '../lib/supabase';

// Test result tracking
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = performance.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      duration: performance.now() - start
    });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      error: error.message,
      duration: performance.now() - start
    });
    console.error(`❌ ${name}:`, error.message);
  }
}

// ============================================
// SUPABASE CONNECTION TESTS
// ============================================

async function testSupabaseConnection() {
  await runTest('Supabase Connection', async () => {
    const { error } = await supabase.from('products').select('count').limit(1);
    if (error) throw error;
  });
}

async function testAuthentication() {
  await runTest('Auth Session Check', async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) throw new Error('No active session - please log in');
  });
}

// ============================================
// PRODUCTS TESTS
// ============================================

async function testProductsList() {
  await runTest('Products - List', async () => {
    const { data, error } = await db.products.list();
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Expected array of products');
    console.log(`  Found ${data?.length || 0} products`);
  });
}

async function testProductCRUD() {
  const testProductId = `test-product-${Date.now()}`;
  
  await runTest('Products - Create', async () => {
    const { data, error } = await db.products.upsert({
      id: testProductId,
      name: 'Test Product',
      front_image_url: 'https://example.com/test.jpg',
      back_image_url: 'https://example.com/test-back.jpg',
      base_price: 99.99,
      width: 400,
      height: 500,
      placement_zone: { x: 10, y: 10, width: 80, height: 80, type: 'rectangle' },
      sort_order: 9999
    });
    if (error) throw error;
    console.log('  Created:', data?.[0]?.id);
  });

  await runTest('Products - Update', async () => {
    const { data, error } = await db.products.upsert({
      id: testProductId,
      name: 'Test Product Updated',
      front_image_url: 'https://example.com/test.jpg',
      back_image_url: 'https://example.com/test-back.jpg',
      base_price: 149.99,
      width: 400,
      height: 500,
      placement_zone: { x: 10, y: 10, width: 80, height: 80, type: 'rectangle' },
      sort_order: 9999
    });
    if (error) throw error;
    if (data?.[0]?.name !== 'Test Product Updated') {
      throw new Error('Update did not persist');
    }
    console.log('  Updated price to:', data?.[0]?.base_price);
  });

  await runTest('Products - Delete', async () => {
    const { error } = await db.products.remove(testProductId);
    if (error) throw error;
    console.log('  Deleted test product');
  });
}

// ============================================
// PATCHES TESTS
// ============================================

async function testPatchesList() {
  await runTest('Patches - List', async () => {
    const { data, error } = await db.patches.list();
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Expected array of patches');
    console.log(`  Found ${data?.length || 0} patches`);
  });
}

async function testPatchCRUD() {
  const testPatchId = `test-patch-${Date.now()}`;
  
  await runTest('Patches - Create', async () => {
    const { data, error } = await db.patches.upsert({
      id: testPatchId,
      name: 'Test Patch',
      category: 'test',
      image_url: 'https://example.com/patch.jpg',
      price: 5.99,
      width: 80,
      height: 80,
      content_zone: { x: 0, y: 0, width: 100, height: 100, type: 'rectangle' },
      sort_order: 9999
    });
    if (error) throw error;
    console.log('  Created:', data?.[0]?.id);
  });

  await runTest('Patches - Update', async () => {
    const { data, error } = await db.patches.upsert({
      id: testPatchId,
      name: 'Test Patch Updated',
      category: 'test',
      image_url: 'https://example.com/patch.jpg',
      price: 9.99,
      width: 80,
      height: 80,
      sort_order: 9999
    });
    if (error) throw error;
    if (data?.[0]?.name !== 'Test Patch Updated') {
      throw new Error('Update did not persist');
    }
    console.log('  Updated price to:', data?.[0]?.price);
  });

  await runTest('Patches - Delete', async () => {
    const { error } = await db.patches.remove(testPatchId);
    if (error) throw error;
    console.log('  Deleted test patch');
  });
}

// ============================================
// ORDERS TESTS
// ============================================

async function testOrdersList() {
  await runTest('Orders - List', async () => {
    const { data, error } = await db.orders.list();
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Expected array of orders');
    console.log(`  Found ${data?.length || 0} orders`);
  });
}

async function testOrderCreate() {
  const testOrderNumber = `TEST-${Date.now()}`;
  
  await runTest('Orders - Create', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (!userId) {
      throw new Error('Must be logged in to test orders');
    }
    
    const { data, error } = await db.orders.create({
      order_number: testOrderNumber,
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
      shipping_country: 'SG',
      user_id: userId
    });
    
    if (error) throw error;
    console.log('  Created order:', data?.order_number);
    
    // Clean up
    if (data?.id) {
      await supabase.from('orders').delete().eq('id', data.id);
    }
  });
}

// ============================================
// STORAGE TESTS
// ============================================

async function testStorage() {
  await runTest('Storage - Check Buckets', async () => {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    const assetsBucket = buckets?.find(b => b.name === 'assets');
    if (!assetsBucket) throw new Error('Assets bucket not found');
    console.log('  Assets bucket exists');
  });
}

// ============================================
// RLS POLICY TESTS
// ============================================

async function testRLSPolicies() {
  await runTest('RLS - Check Admin Role', async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (!userId) throw new Error('Not authenticated');
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    if (profile?.role !== 'admin') {
      throw new Error(`User role is '${profile?.role}', expected 'admin'`);
    }
    console.log('  User has admin role');
  });
}

// ============================================
// MAIN TEST RUNNER
// ============================================

export async function runAllTests(): Promise<TestResult[]> {
  results.length = 0;
  console.log('\n🧪 Starting Patch & Press Component Tests...\n');
  
  // Connection tests
  await testSupabaseConnection();
  await testAuthentication();
  
  // RLS tests
  await testRLSPolicies();
  
  // Products tests
  await testProductsList();
  await testProductCRUD();
  
  // Patches tests
  await testPatchesList();
  await testPatchCRUD();
  
  // Orders tests
  await testOrdersList();
  await testOrderCreate();
  
  // Storage tests
  await testStorage();
  
  // Print summary
  printSummary();
  
  return [...results];
}

function printSummary() {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️ Duration: ${totalDuration.toFixed(2)}ms`);
  console.log('='.repeat(50));
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}`);
      console.log(`     Error: ${r.error}`);
    });
  }
}

// Export individual test groups for selective testing
export const testGroups = {
  connection: [testSupabaseConnection, testAuthentication],
  rls: [testRLSPolicies],
  products: [testProductsList, testProductCRUD],
  patches: [testPatchesList, testPatchCRUD],
  orders: [testOrdersList, testOrderCreate],
  storage: [testStorage]
};

// Default export
export default { runAllTests, testGroups };
