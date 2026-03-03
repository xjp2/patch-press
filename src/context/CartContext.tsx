import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface CartItem {
  id: string;
  name: string;
  productId: string;
  productName: string;
  productImage: string;
  basePrice: number;
  frontPatches: Array<{
    id: string;
    name: string;
    image: string;
    price: number;
  }>;
  backPatches: Array<{
    id: string;
    name: string;
    image: string;
    price: number;
  }>;
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('patchpress-cart');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Sync with Auth
  useEffect(() => {
    import('../lib/supabase').then(({ auth }) => {
      auth.getSession().then(({ data: { session } }) => {
        setCurrentUser(session?.user || null);
      });
      auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user || null);
      });
    });
  }, []);

  // Persistence logic
  useEffect(() => {
    const syncCart = async () => {
      if (typeof window === 'undefined') return;

      localStorage.setItem('patchpress-cart', JSON.stringify(items));

      if (currentUser) {
        try {
          const { db } = await import('../lib/supabase');
          // Items in DB need proper user_id and structure
          const dbItems = items.map(item => ({
            user_id: currentUser.id,
            id: item.id,
            product_id: item.productId,
            product_name: item.productName,
            product_image: item.productImage,
            base_price: item.basePrice,
            front_patches: item.frontPatches,
            back_patches: item.backPatches,
            total_price: item.totalPrice,
            quantity: item.quantity,
            design_image: item.designImage,
            updated_at: new Date().toISOString()
          }));
          await db.cart.upsert(dbItems);
        } catch (err) {
          console.error('Failed to sync cart to cloud:', err);
          // Silently fail - cart is still in localStorage
        }
      }
    };
    syncCart();
  }, [items, currentUser]);

  // Load from Supabase on login (only once)
  const hasLoadedFromCloud = useRef(false);
  useEffect(() => {
    const loadFromCloud = async () => {
      if (currentUser && !hasLoadedFromCloud.current) {
        try {
          const { db } = await import('../lib/supabase');
          const { data, error } = await db.cart.list(currentUser.id);
          if (data && !error && data.length > 0) {
            // Map DB to Frontend
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
          }
          hasLoadedFromCloud.current = true;
        } catch (err) {
          console.error('Failed to load cart from cloud:', err);
        }
      }
    };
    loadFromCloud();
  }, [currentUser]);

  const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === newItem.productId &&
          JSON.stringify(item.frontPatches) === JSON.stringify(newItem.frontPatches) &&
          JSON.stringify(item.backPatches) === JSON.stringify(newItem.backPatches)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }

      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
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

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

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

export default CartContext;
