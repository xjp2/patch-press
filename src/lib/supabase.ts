import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables!\n' +
    'Please create a .env file in the app/ directory with:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key'
  );
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    persistSession: true,
    storage: localStorage,
    storageKey: 'patchpress-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'patchpress-web',
    },
  },
});

// ──────────────── Auth helpers ────────────────
export const auth = {
  signUp: async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    return { data, error };
  },
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Immediately fetch role after sign in - industrial practice
    if (data.user && !error) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user.id)
          .single();
        
        if (profile) {
          // Update user metadata with role for immediate availability
          await supabase.auth.updateUser({
            data: { 
              role: profile.role,
              full_name: profile.full_name 
            }
          });
          
          // Also update the returned user object
          data.user.user_metadata = {
            ...data.user.user_metadata,
            role: profile.role,
            full_name: profile.full_name
          };
        }
      } catch (err) {
        console.warn('Failed to fetch role after sign in:', err);
      }
    }
    
    return { data, error };
  },
  signInWithApple: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { data, error };
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },
};

// ──────────────── Storage helpers ────────────────
export const storage = {
  /**
   * Upload a file to the assets bucket.
   * @param folder - Subfolder e.g. 'products' or 'patches'
   * @param fileName - Unique file name
   * @param file - File or Blob to upload
   * @returns Public URL of the uploaded file
   */
  upload: async (folder: string, fileName: string, file: File | Blob): Promise<string> => {
    const path = `${folder}/${fileName}`;
    const { error } = await supabase.storage.from('assets').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(path);
    return urlData.publicUrl;
  },

  /**
   * Upload from a data URL (base64 string from FileReader).
   */
  uploadDataUrl: async (folder: string, fileName: string, dataUrl: string): Promise<string> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return storage.upload(folder, fileName, blob);
  },

  /**
   * Delete a file from the assets bucket.
   */
  remove: async (folder: string, fileName: string) => {
    const path = `${folder}/${fileName}`;
    const { error } = await supabase.storage.from('assets').remove([path]);
    if (error) throw error;
  },

  /**
   * Get public URL for a file.
   */
  getPublicUrl: (folder: string, fileName: string): string => {
    const path = `${folder}/${fileName}`;
    const { data } = supabase.storage.from('assets').getPublicUrl(path);
    return data.publicUrl;
  },
};

// ──────────────── DB helpers ────────────────
export const db = {
  products: {
    list: async () => {
      console.log('DB: Listing products...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) console.error('DB Error (products.list):', error);
      return { data, error };
    },
    upsert: async (product: any | any[]) => {
      const items = Array.isArray(product) ? product : [product];
      console.log('DB: Upserting products...', items.length);
      const { data, error } = await supabase
        .from('products')
        .upsert(items.map(i => ({ ...i, updated_at: new Date().toISOString() })))
        .select();
      if (error) console.error('DB Error (products.upsert):', error);
      return { data, error };
    },
    remove: async (id: string) => {
      console.log('DB: Removing product...', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) console.error('DB Error (products.remove):', error);
      return { error };
    },
  },

  patches: {
    list: async () => {
      console.log('DB: Listing patches...');
      const { data, error } = await supabase
        .from('patches')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) console.error('DB Error (patches.list):', error);
      return { data, error };
    },
    upsert: async (patch: any | any[]) => {
      const items = Array.isArray(patch) ? patch : [patch];
      console.log('DB: Upserting patches...', items.length);
      const { data, error } = await supabase
        .from('patches')
        .upsert(items.map(i => ({ ...i, updated_at: new Date().toISOString() })))
        .select();
      if (error) console.error('DB Error (patches.upsert):', error);
      return { data, error };
    },
    remove: async (id: string) => {
      console.log('DB: Removing patch...', id);
      const { error } = await supabase.from('patches').delete().eq('id', id);
      if (error) console.error('DB Error (patches.remove):', error);
      return { error };
    },
  },

  siteContent: {
    get: async () => {
      console.log('DB: Getting site content...');
      const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .eq('id', 'current')
        .single();
      if (error) console.error('DB Error (siteContent.get):', error);
      return { data, error };
    },
    save: async (content: {
      landing_page: any;
      footer: any;
      global_settings: any;
      customize_page: any;
      navbar?: any;
    }) => {
      console.log('DB: Saving site content...', {
        landing_page_sections: content.landing_page?.length,
        navbar_fields: content.navbar ? Object.keys(content.navbar) : 'none',
        global_fields: content.global_settings ? Object.keys(content.global_settings) : 'none',
        first_section_type: content.landing_page?.[0]?.type,
        first_section_styling: content.landing_page?.[0]?.styling,
      });
      const { data, error } = await supabase
        .from('site_content')
        .upsert({
          id: 'current',
          landing_page: content.landing_page,
          footer: content.footer,
          global_settings: content.global_settings,
          customize_page: content.customize_page,
          navbar: content.navbar,
          updated_at: new Date().toISOString(),
        })
        .select();
      if (error) console.error('DB Error (siteContent.save):', error);
      return { data, error };
    },
  },

  orders: {
    list: async () => {
      console.log('DB: Listing orders...');
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('DB Error (orders.list):', error);
      return { data, error };
    },
    getById: async (id: string) => {
      console.log('DB: Getting order by id...', id);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      if (error) console.error('DB Error (orders.getById):', error);
      return { data, error };
    },
    create: async (order: {
      order_number: string;
      payment_intent_id: string;
      customer_email: string;
      customer_name?: string;
      items: any[];
      total_amount: number;
      currency: string;
      shipping_address: any;
      shipping_country?: string;
      user_id?: string;
    }) => {
      console.log('DB: Creating order...', order.order_number);
      
      // Create the main order
      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...order,
          status: 'pending',
          payment_verified: false,
          fulfillment_status: 'pending',
        })
        .select()
        .single();
      
      if (error) {
        console.error('DB Error (orders.create):', error);
        return { data, error };
      }
      
      // Create order items for each cart item
      if (data && order.items && order.items.length > 0) {
        const orderItems = order.items.map((item: any) => ({
          order_id: data.id,
          product_id: item.productId || item.product_id,
          patches: [...(item.frontPatches || []), ...(item.backPatches || [])].map((p: any) => p.id),
          design_image_url: item.design_image_url || item.productImage,
          quantity: item.quantity || 1,
          unit_price: item.basePrice || item.unit_price || 0,
          total_price: item.totalPrice || item.total_price || 0,
        }));
        
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);
        
        if (itemsError) {
          console.error('DB Error (order_items.create):', itemsError);
        }
      }
      
      return { data, error };
    },
    updateStatus: async (id: string, status: string) => {
      console.log('DB: Updating order status...', id, status);
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select();
      if (error) console.error('DB Error (orders.updateStatus):', error);
      return { data, error };
    },
  },

  // ──────────────── Inventory Management ────────────────
  inventory: {
    /**
     * Check if products and patches have sufficient quantity
     * Returns array of items with insufficient stock
     */
    checkAvailability: async (items: Array<{
      productId: string;
      patchIds?: string[];
      quantity?: number;
    }>) => {
      console.log('DB: Checking inventory availability...', items.length);
      const insufficient: Array<{ id: string; name: string; requested: number; available: number; type: 'product' | 'patch' }> = [];
      
      for (const item of items) {
        // Check product quantity
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, quantity')
          .eq('id', item.productId)
          .single();
        
        if (productError || !product) {
          insufficient.push({ id: item.productId, name: 'Unknown Product', requested: item.quantity || 1, available: 0, type: 'product' });
          continue;
        }
        
        if ((product.quantity ?? 0) < (item.quantity || 1)) {
          insufficient.push({ id: product.id, name: product.name, requested: item.quantity || 1, available: product.quantity ?? 0, type: 'product' });
        }
        
        // Check patches quantities
        if (item.patchIds && item.patchIds.length > 0) {
          for (const patchId of item.patchIds) {
            const { data: patch, error: patchError } = await supabase
              .from('patches')
              .select('id, name, quantity')
              .eq('id', patchId)
              .single();
            
            if (patchError || !patch) {
              insufficient.push({ id: patchId, name: 'Unknown Patch', requested: 1, available: 0, type: 'patch' });
              continue;
            }
            
            if ((patch.quantity ?? 0) < 1) {
              insufficient.push({ id: patch.id, name: patch.name, requested: 1, available: patch.quantity ?? 0, type: 'patch' });
            }
          }
        }
      }
      
      return { insufficient, available: insufficient.length === 0 };
    },

    /**
     * Deduct quantities after successful order
     * Call this after payment is confirmed
     */
    deductFromOrder: async (orderItems: Array<{
      productId: string;
      patchIds?: string[];
      quantity?: number;
    }>, orderId?: string) => {
      console.log('DB: Deducting inventory from order...', orderItems.length);
      const errors: string[] = [];
      
      for (const item of orderItems) {
        // Deduct product quantity
        const { data: product } = await supabase
          .from('products')
          .select('id, quantity, name')
          .eq('id', item.productId)
          .single();
        
        if (product) {
          const previousQuantity = product.quantity ?? 0;
          const newQuantity = Math.max(0, previousQuantity - (item.quantity || 1));
          
          const { error } = await supabase
            .from('products')
            .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
            .eq('id', item.productId);
          
          if (error) {
            console.error(`Failed to deduct product ${product.name}:`, error);
            errors.push(`Failed to update product: ${product.name}`);
          } else {
            // Log the inventory change
            await supabase.from('inventory_logs').insert({
              product_id: item.productId,
              item_type: 'product',
              change_amount: -(item.quantity || 1),
              previous_quantity: previousQuantity,
              new_quantity: newQuantity,
              reason: orderId ? `Order ${orderId}` : 'Order deduction',
              order_id: orderId,
            });
          }
        }
        
        // Deduct patch quantities - group by patch ID to avoid duplicate log entries
        if (item.patchIds && item.patchIds.length > 0) {
          // Count occurrences of each patch ID
          const patchCounts = item.patchIds.reduce((acc, patchId) => {
            acc[patchId] = (acc[patchId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          // Process each unique patch with its total count
          for (const [patchId, count] of Object.entries(patchCounts)) {
            const { data: patch } = await supabase
              .from('patches')
              .select('id, quantity, name')
              .eq('id', patchId)
              .single();
            
            if (patch) {
              const previousQuantity = patch.quantity ?? 0;
              const newQuantity = Math.max(0, previousQuantity - count);
              
              const { error } = await supabase
                .from('patches')
                .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
                .eq('id', patchId);
              
              if (error) {
                console.error(`Failed to deduct patch ${patch.name}:`, error);
                errors.push(`Failed to update patch: ${patch.name}`);
              } else {
                // Log the inventory change for patch (grouped)
                await supabase.from('inventory_logs').insert({
                  product_id: patchId,
                  item_type: 'patch',
                  change_amount: -count,
                  previous_quantity: previousQuantity,
                  new_quantity: newQuantity,
                  reason: orderId ? `Order ${orderId} - ${count > 1 ? `${count}x ` : ''}Patch used` : `Order patch deduction (${count})`,
                  order_id: orderId,
                });
              }
            }
          }
        }
      }
      
      return { success: errors.length === 0, errors };
    },

    /**
     * Restore quantities when order is cancelled
     */
    restoreFromOrder: async (orderItems: Array<{
      productId: string;
      patchIds?: string[];
      quantity?: number;
    }>) => {
      console.log('DB: Restoring inventory from cancelled order...', orderItems.length);
      
      for (const item of orderItems) {
        // Restore product quantity
        const { data: product } = await supabase
          .from('products')
          .select('id, quantity')
          .eq('id', item.productId)
          .single();
        
        if (product) {
          const newQuantity = (product.quantity ?? 0) + (item.quantity || 1);
          await supabase
            .from('products')
            .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
            .eq('id', item.productId);
        }
        
        // Restore patch quantities
        if (item.patchIds && item.patchIds.length > 0) {
          for (const patchId of item.patchIds) {
            const { data: patch } = await supabase
              .from('patches')
              .select('id, quantity')
              .eq('id', patchId)
              .single();
            
            if (patch) {
              const newQuantity = (patch.quantity ?? 0) + 1;
              await supabase
                .from('patches')
                .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
                .eq('id', patchId);
            }
          }
        }
      }
      
      return { success: true };
    },

    /**
     * Get inventory logs for audit trail
     */
    getLogs: async (productId?: string, limit: number = 50) => {
      console.log('DB: Getting inventory logs...', productId || 'all');
      let query = supabase
        .from('inventory_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      const { data, error } = await query;
      if (error) console.error('DB Error (inventory.getLogs):', error);
      return { data, error };
    },

    /**
     * Restock a product or patch
     */
    restock: async (productId: string, amount: number, type: 'product' | 'patch', reason?: string) => {
      console.log('DB: Restocking...', productId, amount, type);
      
      const table = type === 'product' ? 'products' : 'patches';
      
      // Get current quantity
      const { data: item } = await supabase
        .from(table)
        .select('id, quantity, name')
        .eq('id', productId)
        .single();
      
      if (!item) {
        return { success: false, error: `${type} not found` };
      }
      
      const previousQuantity = item.quantity ?? 0;
      const newQuantity = previousQuantity + amount;
      
      // Update quantity
      const { error: updateError } = await supabase
        .from(table)
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', productId);
      
      if (updateError) {
        console.error('Failed to restock:', updateError);
        return { success: false, error: updateError.message };
      }
      
      // Log the inventory change
      const { error: logError } = await supabase.from('inventory_logs').insert({
        product_id: productId,
        item_type: type,
        change_amount: amount,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reason: reason || `Restock - ${type}`,
      });
      
      if (logError) {
        console.error('Failed to log restock:', logError);
      }
      
      return { success: true, newQuantity };
    },
  },

  // ──────────────── Order Items Helpers ────────────────
  orderItems: {
    /**
     * Get items for a specific order
     */
    getByOrderId: async (orderId: string) => {
      console.log('DB: Getting order items...', orderId);
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      if (error) console.error('DB Error (orderItems.getByOrderId):', error);
      return { data, error };
    },
    
    /**
     * Get sales report by product
     */
    getSalesByProduct: async (startDate?: string, endDate?: string) => {
      console.log('DB: Getting sales by product...');
      let query = supabase
        .from('order_items')
        .select('product_id, quantity, total_price, orders!inner(status, created_at)');
      
      if (startDate) {
        query = query.gte('orders.created_at', startDate);
      }
      if (endDate) {
        query = query.lte('orders.created_at', endDate);
      }
      
      const { data, error } = await query;
      if (error) console.error('DB Error (orderItems.getSalesByProduct):', error);
      return { data, error };
    },
  },

  cart: {
    list: async (userId: string) => {
      console.log('DB: Listing cart items...', userId);
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) console.error('DB Error (cart.list):', error);
      return { data, error };
    },
    upsert: async (items: any[]) => {
      console.log('DB: Upserting cart items...', items.length);
      const { data, error } = await supabase
        .from('cart_items')
        .upsert(items.map(i => ({ ...i, updated_at: new Date().toISOString() })))
        .select();
      if (error) console.error('DB Error (cart.upsert):', error);
      return { data, error };
    },
    remove: async (id: string) => {
      console.log('DB: Removing cart item...', id);
      const { error } = await supabase.from('cart_items').delete().eq('id', id);
      if (error) console.error('DB Error (cart.remove):', error);
      return { error };
    },
    clear: async (userId: string) => {
      console.log('DB: Clearing cart...', userId);
      const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
      if (error) console.error('DB Error (cart.clear):', error);
      return { error };
    }
  }
};

// ──────────────── Payment helpers ────────────────
export const payment = {
  createPaymentIntent: async (amount: number, currency: string = 'usd') => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { amount, currency },
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Payment intent error:', error);
      throw error;
    }
  },
};

// ──────────────── Mapping helpers ────────────────
// Convert between DB row format and frontend TypeScript interfaces

export function dbProductToFrontend(row: any) {
  return {
    id: row.id,
    name: row.name,
    frontImage: row.front_image_url,
    backImage: row.back_image_url,
    basePrice: Number(row.base_price),
    width: row.width,
    height: row.height,
    quantity: row.quantity ?? 0,
    placementZone: row.placement_zone || { x: 15, y: 25, width: 70, height: 60, type: 'rectangle' },
    cropZone: row.crop_zone,
  };
}

export function frontendProductToDb(product: any, sortOrder: number = 0) {
  return {
    id: product.id,
    name: product.name,
    front_image_url: product.frontImage,
    back_image_url: product.backImage,
    base_price: product.basePrice,
    width: product.width,
    height: product.height,
    quantity: product.quantity ?? 0,
    placement_zone: product.placementZone,
    crop_zone: product.cropZone || null,
    sort_order: sortOrder,
  };
}

export function dbPatchToFrontend(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    image: row.image_url,
    price: Number(row.price),
    width: row.width,
    height: row.height,
    quantity: row.quantity ?? 0,
    contentZone: row.content_zone,
  };
}

export function frontendPatchToDb(patch: any, sortOrder: number = 0) {
  return {
    id: patch.id,
    name: patch.name,
    category: patch.category,
    image_url: patch.image,
    price: patch.price,
    width: patch.width,
    height: patch.height,
    quantity: patch.quantity ?? 0,
    content_zone: patch.contentZone || null,
    sort_order: sortOrder,
  };
}

export default supabase;
