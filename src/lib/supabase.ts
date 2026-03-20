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
      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...order,
          status: 'pending',  // Webhook will validate and mark as 'paid'
          payment_verified: false,
          fulfillment_status: 'pending',
        })
        .select()
        .single();
      if (error) {
        console.error('DB Error (orders.create):', error);
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
    content_zone: patch.contentZone || null,
    sort_order: sortOrder,
  };
}

export default supabase;
