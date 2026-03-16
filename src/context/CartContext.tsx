import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface PlacedPatchData {
  id: string;
  name: string;
  image: string;
  price: number;
  x: number; // Percentage (0-100) relative to product image
  y: number; // Percentage (0-100) relative to product image
  rotation: number;
  widthPercent: number;
  heightPercent: number;
}

export interface CartItem {
  id: string;
  name: string;
  productId: string;
  productName: string;
  productImage: string;
  productBackImage?: string; // Back view of product
  basePrice: number;
  frontPatches: PlacedPatchData[];
  backPatches: PlacedPatchData[];
  totalPrice: number;
  quantity: number;
  designImage?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  mergeGuestCartOnLogin: (userId: string) => Promise<void>;
  isLoading: boolean;
  syncCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_CART_KEY = 'patchpress-cart-guest';
const USER_CART_KEY = 'patchpress-cart-user';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastSyncedItems = useRef<string>('');
  const syncInProgress = useRef(false);

  // Initialize cart on mount
  useEffect(() => {
    const initCart = async () => {
      console.log('🛒 Cart: Initializing...');
      setIsLoading(true);
      
      try {
        const { auth } = await import('../lib/supabase');
        const { data: { session } } = await auth.getSession();
        const user = session?.user || null;
        
        console.log('🛒 Cart: User session:', user?.id || 'guest');
        setCurrentUser(user);

        if (user) {
          // Load from cloud for logged-in user
          console.log('🛒 Cart: Loading from cloud for user:', user.id);
          await loadUserCart(user.id);
        } else {
          // Load from localStorage for guest
          const guestCart = localStorage.getItem(GUEST_CART_KEY);
          if (guestCart) {
            const parsed = JSON.parse(guestCart);
            console.log('🛒 Cart: Loaded guest cart from localStorage:', parsed.length, 'items');
            setItems(parsed);
            lastSyncedItems.current = guestCart;
          } else {
            console.log('🛒 Cart: No guest cart in localStorage');
          }
        }
      } catch (err) {
        console.error('🛒 Cart: Init error:', err);
      } finally {
        setIsInitialized(true);
        setIsLoading(false);
        console.log('🛒 Cart: Initialization complete');
      }
    };

    initCart();
  }, []);

  // Sync with Auth state changes
  useEffect(() => {
    let mounted = true;

    const setupAuthListener = async () => {
      const { auth } = await import('../lib/supabase');
      
      auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        const user = session?.user || null;
        const prevUser = currentUser;
        
        console.log('🛒 Cart: Auth state changed:', event, 'User:', user?.id || 'none');
        setCurrentUser(user);

        if (event === 'SIGNED_IN' && user && !prevUser) {
          // User just logged in - merge guest cart with cloud cart
          console.log('🛒 Cart: User signed in, merging carts...');
          await mergeGuestCartOnLogin(user.id);
        } else if (event === 'SIGNED_OUT') {
          // User logged out - clear cart and load guest cart if any
          console.log('🛒 Cart: User signed out');
          setItems([]);
          lastSyncedItems.current = '';
          const guestCart = localStorage.getItem(GUEST_CART_KEY);
          if (guestCart) {
            setItems(JSON.parse(guestCart));
            lastSyncedItems.current = guestCart;
          }
        }
      });
    };

    setupAuthListener();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // Persist cart to appropriate storage
  const syncCart = useCallback(async () => {
    if (syncInProgress.current) {
      console.log('🛒 Cart: Sync already in progress, skipping');
      return;
    }

    if (!isInitialized) {
      console.log('🛒 Cart: Skip sync - not initialized yet');
      return;
    }

    const itemsJson = JSON.stringify(items);
    
    // Skip if items haven't changed
    if (itemsJson === lastSyncedItems.current) {
      console.log('🛒 Cart: Skip sync - no changes');
      return;
    }

    syncInProgress.current = true;
    
    try {
      if (currentUser) {
        // Save to cloud for logged-in user
        console.log('🛒 Cart: Syncing to cloud for user:', currentUser.id, 'Items:', items.length);
        
        const { db } = await import('../lib/supabase');
        
        if (items.length === 0) {
          // Clear cart in database
          console.log('🛒 Cart: Clearing cloud cart');
          await db.cart.clear(currentUser.id);
        } else {
          const dbItems = items.map(item => ({
            user_id: currentUser.id,
            id: item.id,
            product_id: item.productId,
            product_name: item.productName,
            product_image: item.productImage,
            base_price: item.basePrice,
            front_patches: item.frontPatches || [],
            back_patches: item.backPatches || [],
            total_price: item.totalPrice,
            quantity: item.quantity,
            design_image: item.designImage,
            updated_at: new Date().toISOString()
          }));
          
          console.log('🛒 Cart: Upserting items:', dbItems.length);
          const { error } = await db.cart.upsert(dbItems);
          
          if (error) {
            console.error('🛒 Cart: Failed to sync to cloud:', error);
            throw error;
          } else {
            console.log('🛒 Cart: Successfully synced to cloud');
          }
        }
        
        // Also save to localStorage as backup
        localStorage.setItem(USER_CART_KEY, itemsJson);
        lastSyncedItems.current = itemsJson;
      } else {
        // Save to localStorage for guest
        console.log('🛒 Cart: Saving to localStorage:', items.length, 'items');
        localStorage.setItem(GUEST_CART_KEY, itemsJson);
        lastSyncedItems.current = itemsJson;
      }
    } catch (err) {
      console.error('🛒 Cart: Sync error:', err);
    } finally {
      syncInProgress.current = false;
    }
  }, [items, currentUser, isInitialized]);

  // Auto-sync when items change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      syncCart();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [items, syncCart]);

  // Load user's cart from cloud
  const loadUserCart = async (userId: string) => {
    try {
      console.log('🛒 Cart: Loading user cart from DB:', userId);
      const { db } = await import('../lib/supabase');
      const { data, error } = await db.cart.list(userId);
      
      if (error) {
        console.error('🛒 Cart: Error loading from DB:', error);
        throw error;
      }
      
      console.log('🛒 Cart: Loaded from DB:', data?.length || 0, 'items');
      
      if (data && data.length > 0) {
        const frontendItems = data.map((row: any) => ({
          id: row.id,
          productId: row.product_id,
          productName: row.product_name,
          productImage: row.product_image,
          basePrice: Number(row.base_price),
          frontPatches: row.front_patches || [],
          backPatches: row.back_patches || [],
          totalPrice: Number(row.total_price),
          quantity: row.quantity,
          designImage: row.design_image,
          name: row.product_name
        }));
        setItems(frontendItems);
        lastSyncedItems.current = JSON.stringify(frontendItems);
      } else {
        setItems([]);
        lastSyncedItems.current = '[]';
      }
    } catch (err) {
      console.error('🛒 Cart: Failed to load user cart:', err);
      setItems([]);
      lastSyncedItems.current = '[]';
    }
  };

  // Merge guest cart with user's cloud cart on login
  const mergeGuestCartOnLogin = async (userId: string) => {
    const guestCartStr = localStorage.getItem(GUEST_CART_KEY);
    const guestItems: CartItem[] = guestCartStr ? JSON.parse(guestCartStr) : [];

    console.log('🛒 Cart: Merging - Guest items:', guestItems.length);

    if (guestItems.length === 0) {
      // No guest cart to merge, just load user's cart
      console.log('🛒 Cart: No guest items, loading cloud cart');
      await loadUserCart(userId);
      return;
    }

    try {
      setIsLoading(true);
      const { db } = await import('../lib/supabase');
      
      // Get user's existing cloud cart
      const { data: cloudData, error } = await db.cart.list(userId);
      
      if (error) throw error;

      const cloudItems: CartItem[] = (cloudData || []).map((row: any) => ({
        id: row.id,
        productId: row.product_id,
        productName: row.product_name,
        productImage: row.product_image,
        basePrice: Number(row.base_price),
        frontPatches: row.front_patches || [],
        backPatches: row.back_patches || [],
        totalPrice: Number(row.total_price),
        quantity: row.quantity,
        designImage: row.design_image,
        name: row.product_name
      }));

      console.log('🛒 Cart: Cloud items:', cloudItems.length);

      // Merge carts: guest items + cloud items (deduplicate by product + patches)
      const mergedItems = [...guestItems];
      
      for (const cloudItem of cloudItems) {
        const existingIndex = mergedItems.findIndex(
          item => item.productId === cloudItem.productId &&
            JSON.stringify(item.frontPatches) === JSON.stringify(cloudItem.frontPatches) &&
            JSON.stringify(item.backPatches) === JSON.stringify(cloudItem.backPatches)
        );

        if (existingIndex >= 0) {
          // Same item exists - keep the higher quantity
          mergedItems[existingIndex].quantity = Math.max(
            mergedItems[existingIndex].quantity,
            cloudItem.quantity
          );
        } else {
          // Add cloud item to merged cart
          mergedItems.push(cloudItem);
        }
      }

      console.log('🛒 Cart: Merged items:', mergedItems.length);

      // Save merged cart
      setItems(mergedItems);
      lastSyncedItems.current = JSON.stringify(mergedItems);
      
      // Sync to cloud
      const dbItems = mergedItems.map(item => ({
        user_id: userId,
        id: item.id,
        product_id: item.productId,
        product_name: item.productName,
        product_image: item.productImage,
        base_price: item.basePrice,
        front_patches: item.frontPatches || [],
        back_patches: item.backPatches || [],
        total_price: item.totalPrice,
        quantity: item.quantity,
        design_image: item.designImage,
        updated_at: new Date().toISOString()
      }));
      
      const { error: upsertError } = await db.cart.upsert(dbItems);
      if (upsertError) throw upsertError;

      // Clear guest cart after successful merge
      localStorage.removeItem(GUEST_CART_KEY);
      
      console.log(`✅ Merged ${guestItems.length} guest items with ${cloudItems.length} cloud items`);
    } catch (err) {
      console.error('🛒 Cart: Failed to merge carts:', err);
      // Fallback: just use guest items
      setItems(guestItems);
      lastSyncedItems.current = JSON.stringify(guestItems);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
    console.log('🛒 Cart: Adding item:', newItem.productName);
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === newItem.productId &&
          JSON.stringify(item.frontPatches) === JSON.stringify(newItem.frontPatches) &&
          JSON.stringify(item.backPatches) === JSON.stringify(newItem.backPatches)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        console.log('🛒 Cart: Updated quantity for existing item');
        return updated;
      }

      console.log('🛒 Cart: Added new item');
      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    console.log('🛒 Cart: Removing item:', id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(async () => {
    console.log('🛒 Cart: Clearing cart');
    setItems([]);
    lastSyncedItems.current = '[]';
    
    if (currentUser) {
      localStorage.removeItem(USER_CART_KEY);
      try {
        const { db } = await import('../lib/supabase');
        await db.cart.clear(currentUser.id);
      } catch (err) {
        console.error('🛒 Cart: Failed to clear cloud cart:', err);
      }
    } else {
      localStorage.removeItem(GUEST_CART_KEY);
    }
  }, [currentUser]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.totalPrice * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
        mergeGuestCartOnLogin,
        isLoading,
        syncCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
