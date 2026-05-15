import { useState, useEffect } from 'react';
import { LogOut, Settings, User, ShoppingCart, X, Plus, Minus, Trash2, ChevronDown, ChevronUp, Package, Loader2, Menu } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';
import { AuthModal } from './AuthModal';
import type { UserType, AuthView } from './AuthModal';
import { AdminPanel } from './AdminPanel';
import { PatchuuLogo } from './components/PatchuuLogo';
import type { Product, Patch, SiteContent } from './AdminPanel';
import { LandingPage } from './LandingPage';
import { CustomizePage } from './CustomizePage';
import { CartProvider, useCart } from './context/CartContext';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import supabase, { auth } from './lib/supabase';
import { preloadCmsData, clearCmsCache, hasStaticCms } from './lib/cms';
import type { Product as DbProduct, Patch as DbPatch } from './lib/cms';
import { fixImagePath, getResizedImageUrl } from './lib/utils';
import { CroppedThumbnail } from './components/CroppedThumbnail';
import { StripeCheckout } from './components/StripeCheckout';
import { OrderConfirmation } from './components/OrderConfirmation';
import { OrderDetailPage } from './components/OrderDetailPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';
import { RefundPolicyPage } from './components/RefundPolicyPage';
import { ShippingPolicyPage } from './components/ShippingPolicyPage';

type AppView = 'landing' | 'customize' | 'order-detail' | 'admin' | 'privacy' | 'terms' | 'refund' | 'shipping';


const initialPatches: Patch[] = [
  { id: '1', name: 'Fried Egg', category: 'food', image: '/patch-egg.png', price: 3, quantity: 50, width: 80, height: 80 },
  { id: '2', name: 'Burger', category: 'food', image: '/patch-burger.png', price: 4, quantity: 50, width: 90, height: 90 },
  { id: '3', name: 'Fries', category: 'food', image: '/patch-fries.png', price: 3, quantity: 50, width: 70, height: 90 },
  { id: '11', name: 'Beer', category: 'food', image: '/patch-beer.png', price: 3, quantity: 50, width: 50, height: 90 },
  { id: '15', name: 'Ice Cream', category: 'food', image: '/patch-icecream.png', price: 3, quantity: 50, width: 60, height: 100 },
  { id: '16', name: 'Watermelon', category: 'food', image: '/patch-watermelon.png', price: 3, quantity: 50, width: 90, height: 70 },
  { id: '17', name: 'Pizza', category: 'food', image: '/patch-pizza.png', price: 3, quantity: 50, width: 90, height: 90 },
  { id: '19', name: 'Strawberry', category: 'food', image: '/patch-strawberry.png', price: 3, quantity: 50, width: 70, height: 80 },
  { id: '20', name: 'Banana', category: 'food', image: '/patch-banana.png', price: 3, quantity: 50, width: 80, height: 70 },
  { id: '21', name: 'Donut', category: 'food', image: '/patch-donut.png', price: 3, quantity: 50, width: 80, height: 80 },
  { id: '22', name: 'Croissant', category: 'food', image: '/patch-croissant.png', price: 3, quantity: 50, width: 90, height: 70 },
  { id: '23', name: 'Cupcake', category: 'food', image: '/patch-cupcake.png', price: 3, quantity: 50, width: 70, height: 90 },
  { id: '24', name: 'Boba Tea', category: 'food', image: '/patch-boba.png', price: 4, quantity: 50, width: 60, height: 100 },
  { id: '25', name: 'Coffee', category: 'food', image: '/patch-coffee.png', price: 3, quantity: 50, width: 70, height: 90 },
  { id: '26', name: 'Milk', category: 'food', image: '/patch-milk.png', price: 3, quantity: 50, width: 60, height: 90 },
  { id: '27', name: 'Lemon', category: 'food', image: '/patch-lemon.png', price: 3, quantity: 50, width: 80, height: 70 },
  { id: '28', name: 'Peach', category: 'food', image: '/patch-peach.png', price: 3, quantity: 50, width: 80, height: 80 },
  { id: '29', name: 'Cherry', category: 'food', image: '/patch-cherry.png', price: 3, quantity: 50, width: 80, height: 80 },
  { id: '7', name: 'Cat', category: 'characters', image: '/patch-cat.png', price: 4, quantity: 50, width: 90, height: 90 },
  { id: '8', name: 'Dog', category: 'characters', image: '/patch-dog.png', price: 4, quantity: 50, width: 90, height: 90 },
  { id: '14', name: 'Bear', category: 'characters', image: '/patch-bear.png', price: 4, quantity: 50, width: 90, height: 90 },
  { id: '18', name: 'Cactus', category: 'characters', image: '/patch-cactus.png', price: 4, quantity: 50, width: 70, height: 100 },
  { id: '30', name: 'Panda', category: 'characters', image: '/patch-panda.png', price: 4, quantity: 50, width: 90, height: 90 },
  { id: '31', name: 'Rabbit', category: 'characters', image: '/patch-rabbit.png', price: 4, quantity: 50, width: 80, height: 100 },
  { id: '32', name: 'Hamster', category: 'characters', image: '/patch-hamster.png', price: 4, quantity: 50, width: 90, height: 90 },
  { id: '33', name: 'Penguin', category: 'characters', image: '/patch-penguin.png', price: 4, quantity: 50, width: 70, height: 100 },
  { id: '34', name: 'Chick', category: 'characters', image: '/patch-chick.png', price: 4, quantity: 50, width: 80, height: 90 },
  { id: '9', name: 'Letter S', category: 'letters', image: '/patch-letter-s.png', price: 2, quantity: 50, width: 70, height: 90 },
  { id: '10', name: 'Letter J', category: 'letters', image: '/patch-letter-j.png', price: 2, quantity: 50, width: 70, height: 90 },
  { id: '4', name: 'Pink Bow', category: 'symbols', image: '/patch-bow.png', price: 2, quantity: 50, width: 90, height: 70 },
  { id: '5', name: 'Rainbow', category: 'symbols', image: '/patch-rainbow.png', price: 3, quantity: 50, width: 100, height: 70 },
  { id: '6', name: 'Heart', category: 'symbols', image: '/patch-heart.png', price: 2, quantity: 50, width: 80, height: 80 },
  { id: '12', name: 'Car', category: 'symbols', image: '/patch-car.png', price: 4, quantity: 50, width: 100, height: 70 },
  { id: '13', name: 'Star', category: 'symbols', image: '/patch-star.png', price: 2, quantity: 50, width: 90, height: 90 },
  { id: '35', name: 'Flower', category: 'symbols', image: '/patch-flower.png', price: 3, quantity: 50, width: 80, height: 80 },
  { id: '36', name: 'Sunflower', category: 'symbols', image: '/patch-sunflower.png', price: 3, quantity: 50, width: 90, height: 90 },
  { id: '37', name: 'Tulip', category: 'symbols', image: '/patch-tulip.png', price: 3, quantity: 50, width: 70, height: 90 },
  { id: '38', name: 'Clover', category: 'symbols', image: '/patch-clover.png', price: 2, quantity: 50, width: 80, height: 80 },
  { id: '39', name: 'Butterfly', category: 'symbols', image: '/patch-butterfly.png', price: 3, quantity: 50, width: 100, height: 80 },
  { id: '40', name: 'Bee', category: 'symbols', image: '/patch-bee.png', price: 3, quantity: 50, width: 90, height: 80 },
  { id: '41', name: 'Music Note', category: 'symbols', image: '/patch-music.png', price: 2, quantity: 50, width: 60, height: 90 },
  { id: '42', name: 'Lightning', category: 'symbols', image: '/patch-lightning.png', price: 2, quantity: 50, width: 60, height: 100 },
];

const initialProducts: Product[] = [
  { id: 'tote', name: 'Canvas Tote', frontImage: '/tote-bag.png', backImage: '/tote-bag.png', basePrice: 25, quantity: 10, width: 400, height: 500, placementZone: { x: 15, y: 25, width: 70, height: 60, type: 'rectangle' } },
  { id: 'keychain-blue', name: 'Blue Keychain', frontImage: '/keychain-strap-blue.png', backImage: '/keychain-strap-blue.png', basePrice: 12, quantity: 20, width: 300, height: 100, placementZone: { x: 10, y: 20, width: 80, height: 60, type: 'rectangle' } },
  { id: 'keychain-purple', name: 'Purple Keychain', frontImage: '/keychain-strap-purple.png', backImage: '/keychain-strap-purple.png', basePrice: 12, quantity: 20, width: 300, height: 100, placementZone: { x: 10, y: 20, width: 80, height: 60, type: 'rectangle' } },
  { id: 'keychain-white', name: 'White Keychain', frontImage: '/keychain-strap-white.png', backImage: '/keychain-strap-white.png', basePrice: 12, quantity: 20, width: 300, height: 100, placementZone: { x: 10, y: 20, width: 80, height: 60, type: 'rectangle' } },
  { id: 'pouch', name: 'Beige Pouch', frontImage: '/pouch-beige.png', backImage: '/pouch-beige.png', basePrice: 18, quantity: 15, width: 350, height: 250, placementZone: { x: 15, y: 20, width: 70, height: 65, type: 'rectangle' } },
  { id: 'cardholder', name: 'Cardholder', frontImage: '/cardholder-yellow.png', backImage: '/cardholder-yellow.png', basePrice: 15, quantity: 15, width: 300, height: 200, placementZone: { x: 10, y: 15, width: 80, height: 70, type: 'rectangle' } },
];

// Cart Item Component with expandable details
function CartItemCard({ item, updateQuantity, removeItem }: { 
  item: import('./context/CartContext').CartItem; 
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
}) {
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  // Handle old cart data that may not have frontPatches/backPatches
  const frontPatches = item.frontPatches || [];
  const backPatches = item.backPatches || [];
  // Handle legacy cart items that only have patches array
  const legacyPatches = (item as any).patches || [];
  const totalPatches = frontPatches.length + backPatches.length + legacyPatches.length;
  const patchPrice = frontPatches.reduce((sum: number, p: any) => sum + (p.price || 0), 0) + 
                     backPatches.reduce((sum: number, p: any) => sum + (p.price || 0), 0) +
                     legacyPatches.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
  
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      {/* Main Preview Row */}
      <div className="flex gap-3">
        {/* Product Preview Image — measures actual image, matches ProductCard */}
        <CroppedThumbnail
          src={fixImagePath(item.productImage) || '/tote-bag.png'}
          zone={item.placementZone}
          className="w-20 h-20 bg-cardstock rounded-lg border border-ink/10 flex-shrink-0"
          alt={item.productName}
        />
        
        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-sm">{item.productName}</h4>
              <p className="text-xs text-ink-muted mt-0.5">
                Base: {formatPrice(item.basePrice || 0)}
              </p>
              <p className="text-xs text-ink-muted">
                {totalPatches} patch{totalPatches !== 1 ? 'es' : ''} (+{formatPrice(patchPrice)})
              </p>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="p-1 hover:bg-red-100 rounded-full text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 mt-2 text-xs text-ink-muted hover:text-ink/80 hover:bg-cardstock rounded-lg transition-colors"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {expanded ? 'Hide Details' : 'View Patches'}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-ink/10 space-y-3">
          {/* Front Side Patches */}
          {frontPatches.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-ink/70 mb-2">Front Side</h5>
              <div className="space-y-1.5">
                {frontPatches.map((patch) => (
                  <div key={patch.id} className="flex items-center justify-between bg-cardstock rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <img src={getResizedImageUrl(patch.image, 48)} alt={patch.name} className="w-6 h-6 object-contain" loading="lazy" decoding="async" />
                      <span className="text-xs">{patch.name}</span>
                    </div>
                    <span className="text-xs font-medium">{formatPrice(patch.price || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back Side Patches */}
          {backPatches.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-ink/70 mb-2">Back Side</h5>
              <div className="space-y-1.5">
                {backPatches.map((patch) => (
                  <div key={patch.id} className="flex items-center justify-between bg-cardstock rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <img src={getResizedImageUrl(patch.image, 48)} alt={patch.name} className="w-6 h-6 object-contain" loading="lazy" decoding="async" />
                      <span className="text-xs">{patch.name}</span>
                    </div>
                    <span className="text-xs font-medium">{formatPrice(patch.price || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy Patches (old cart data) */}
          {legacyPatches.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-ink/70 mb-2">Patches</h5>
              <div className="space-y-1.5">
                {legacyPatches.map((patch: any) => (
                  <div key={patch.id} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <img src={getResizedImageUrl(patch.image, 48)} alt={patch.name} className="w-6 h-6 object-contain" loading="lazy" decoding="async" />
                      <span className="text-xs">{patch.name}</span>
                    </div>
                    <span className="text-xs font-medium">{formatPrice(patch.price || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="pt-2 border-t border-ink/10 text-xs space-y-1">
            <div className="flex justify-between text-ink-muted">
              <span>Base Product</span>
              <span>{formatPrice(item.basePrice || 0)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Patches ({totalPatches})</span>
              <span>{formatPrice(patchPrice)}</span>
            </div>
            <div className="flex justify-between font-semibold text-ink/80 pt-1 border-t">
              <span>Item Total</span>
              <span>{formatPrice(item.totalPrice)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quantity & Price Controls */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            className="p-1 hover:bg-cardstock rounded-full bg-cardstock"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="p-1 hover:bg-cardstock rounded-full bg-cardstock"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <span className="font-bold">{formatPrice(item.totalPrice * item.quantity)}</span>
      </div>
    </div>
  );
}

// Cart Drawer Component
interface CartDrawerProps {
  currentUser: UserType | null;
  setShowAuth: (show: boolean) => void;
  setAuthView: (view: AuthView) => void;
}

function CartDrawer({ currentUser, setShowAuth, setAuthView }: CartDrawerProps) {
  const { items, isCartOpen, setIsCartOpen, totalPrice, totalItems, updateQuantity, removeItem, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const [showCheckout, setShowCheckout] = useState(false);
  const [, setCheckoutState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderSummary, setOrderSummary] = useState<{items: typeof items, totalPrice: number} | null>(null);

  const handleCheckoutSuccess = async (orderData?: { orderId: string; orderNumber: string }) => {
    setCheckoutState('success');
    
    // Capture order summary BEFORE clearing cart
    setOrderSummary({ items: [...items], totalPrice });
    
    // Use order number from created order, or generate fallback
    const displayOrderNum = orderData?.orderNumber || `ORD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    setOrderNumber(displayOrderNum);
    setShowOrderConfirmation(true);
    
    // Clear cart after a delay
    setTimeout(() => {
      clearCart();
    }, 500);
  };
  
  const handleCloseOrderConfirmation = () => {
    setShowOrderConfirmation(false);
    setCheckoutState('idle');
    setShowCheckout(false);
    setIsCartOpen(false);
  };

  const handleCheckoutError = (error: string) => {
    setCheckoutError(error);
    setCheckoutState('error');
  };

  // Check inventory before proceeding to checkout
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [isCheckingInventory, setIsCheckingInventory] = useState(false);

  const handleProceedToCheckout = async () => {
    setIsCheckingInventory(true);
    setInventoryError(null);
    
    try {
      const { db } = await import('./lib/supabase');
      
      // Prepare items for inventory check
      const inventoryItems = items.map(item => ({
        productId: item.productId,
        patchIds: [...(item.frontPatches || []), ...(item.backPatches || [])].map((p: any) => p.id),
        quantity: item.quantity,
      }));
      
      const { insufficient, available } = await db.inventory.checkAvailability(inventoryItems);
      
      if (!available) {
        const errorMessages = insufficient.map(item => 
          `${item.name} (${item.type}): ${item.available} available, ${item.requested} requested`
        );
        setInventoryError(`Insufficient stock:\n${errorMessages.join('\n')}`);
      } else {
        setShowCheckout(true);
      }
    } catch (err) {
      console.error('Error checking inventory:', err);
      // Allow checkout to proceed even if inventory check fails
      setShowCheckout(true);
    } finally {
      setIsCheckingInventory(false);
    }
  };

  const handleClose = () => {
    setIsCartOpen(false);
    setShowCheckout(false);
    setCheckoutState('idle');
    setCheckoutError('');
    // Clear pending checkout intent when cart is closed
    localStorage.removeItem('pending_checkout');
  };

  // Show Order Confirmation as full page overlay (before cart open check)
  if (showOrderConfirmation && orderSummary) {
    return (
      <OrderConfirmation
        orderNumber={orderNumber}
        orderDate={new Date().toISOString()}
        customerEmail={currentUser?.email || 'guest@example.com'}
        items={orderSummary.items.map(i => ({ 
          name: i.productName, 
          basePrice: i.basePrice,
          patches: [...(i.frontPatches || []), ...(i.backPatches || [])].map(p => ({ name: p.name, image: p.image, price: p.price })), 
          qty: i.quantity, 
          productImage: i.productImage,
          placementZone: i.placementZone
        }))}
        totalAmount={orderSummary.totalPrice}
        onContinueShopping={handleCloseOrderConfirmation}
      />
    );
  }

  if (!isCartOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-cardstock z-50 shadow-paper-lg border-[2.5px] border-ink rounded-[1.25rem] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">
            {showCheckout ? 'Checkout' : `Shopping Cart (${totalItems})`}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-cardstock rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {showCheckout ? (
            // Checkout View
            <div className="space-y-4">
              <button
                onClick={() => setShowCheckout(false)}
                className="text-sm text-ink-muted hover:text-ink/80 flex items-center gap-1"
              >
                ← Back to cart
              </button>
              
              {/* Show error prominently at top of checkout -->
              {checkoutError && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">Payment Failed</p>
                    <p className="text-red-700 text-sm mt-1">{checkoutError}</p>
                    <p className="text-red-600 text-xs mt-2">Please check your details and try again below.</p>
                  </div>
                </div>
              )}

              {/* Payment Step with AddressElement */}
              <StripeCheckout
                amount={totalPrice}
                userId={currentUser?.id}
                customerEmail={currentUser?.email}
                cartItems={items}
                onSuccess={handleCheckoutSuccess}
                onError={handleCheckoutError}
              />
            </div>
          ) : (
            // Cart View
            items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-ink/20 mx-auto mb-4" />
                <p className="text-ink-muted">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItemCard 
                    key={item.id} 
                    item={item} 
                    updateQuantity={updateQuantity}
                    removeItem={removeItem}
                  />
                ))}
              </div>
            )
          )}
        </div>

        {!showCheckout && items.length > 0 && (
          <div className="border-t p-4 space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <p className="text-[10px] text-ink/40 text-right">Prices converted using current exchange rates</p>
            {checkoutError && !showCheckout && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{checkoutError}</div>
            )}
            {inventoryError && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded whitespace-pre-line">
                {inventoryError}
              </div>
            )}
            {currentUser ? (
              // Logged in - show checkout button
              <button
                onClick={handleProceedToCheckout}
                disabled={isCheckingInventory}
                className="w-full bg-craft-mint text-ink border-[2.5px] border-ink rounded-[1.25rem] shadow-paper py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCheckingInventory ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Checking Stock...</>
                ) : (
                  'Proceed to Checkout'
                )}
              </button>
            ) : (
              // Not logged in - show sign in button
              <div className="space-y-2">
                <button
                  onClick={() => {
                    // Store intent to checkout after login
                    localStorage.setItem('pending_checkout', 'true');
                    setIsCartOpen(false);
                    setAuthView('login');
                    setShowAuth(true);
                  }}
                  className="w-full bg-craft-mint text-ink border-[2.5px] border-ink rounded-[1.25rem] shadow-paper py-3 flex items-center justify-center gap-2"
                >
                  Sign in to Checkout
                </button>
                <p className="text-xs text-ink-muted text-center">
                  Please sign in or create an account to complete your purchase
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// User Orders Component
interface UserOrder {
    id: string;
    order_number: string;
    items: Array<{
        name: string;
        patches: string[];
        qty: number;
        price: number;
    }>;
    total_amount: number;
    status: string;
    fulfillment_status: string;
    tracking_number: string | null;
    created_at: string;
    shipped_at: string | null;
    delivered_at: string | null;
    currency: string;
}

function UserOrdersModal({ show, onClose, userId, onViewOrder }: { show: boolean; onClose: () => void; userId: string; onViewOrder: (orderId: string) => void }) {
    const [orders, setOrders] = useState<UserOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const formatOrderCurrency = (amount: number, currency: string) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency?.toUpperCase() || 'SGD',
      }).format(amount);
    };

    useEffect(() => {
        if (show && userId) {
            loadOrders();
        }
    }, [show, userId]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('id, order_number, items, total_amount, status, fulfillment_status, tracking_number, created_at, shipped_at, delivered_at, currency')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            shipped: 'bg-purple-100 text-purple-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
            paid: 'bg-green-100 text-green-800',
            amount_mismatch: 'bg-red-100 text-red-800',
        };
        return styles[status] || 'bg-cardstock text-ink/80';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return '⏳';
            case 'paid': return '✅';
            case 'processing': return '🔧';
            case 'shipped': return '📦';
            case 'delivered': return '✅';
            case 'cancelled': return '❌';
            case 'amount_mismatch': return '⚠️';
            default: return '📋';
        }
    };

    if (!show) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-cardstock z-50 shadow-paper-lg border-[2.5px] border-ink rounded-[1.25rem] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold">My Orders</h2>
                    <button onClick={onClose} className="p-2 hover:bg-cardstock rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-craft-mint" />
                            <span className="ml-2 text-ink/70">Loading orders...</span>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="w-16 h-16 text-ink/20 mx-auto mb-4" />
                            <p className="text-ink-muted">No orders yet</p>
                            <p className="text-sm text-ink/40 mt-2">Your order history will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="border border-ink/10 rounded-xl p-4 hover:shadow-md transition-shadow bg-cardstock cursor-pointer"
                                    onClick={() => {
                                        onClose();
                                        onViewOrder(order.id);
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">#{order.order_number}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                                                    {getStatusIcon(order.status)} {order.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-ink/40 mt-1">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{formatOrderCurrency(Number(order.total_amount), order.currency)}</p>
                                        </div>
                                    </div>

                                    {/* Items Preview */}
                                    <div className="text-sm text-ink/70">
                                        {order.items?.map((item, idx) => (
                                            <span key={idx}>
                                                {item.name} × {item.qty}
                                                {idx < (order.items?.length || 0) - 1 && ', '}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Tracking Info */}
                                    {order.tracking_number && (
                                        <div className="mt-2 text-sm">
                                            <span className="text-purple-700">
                                                📦 Tracking: {order.tracking_number}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// Navbar Component
interface NavbarProps {
  navbar: import('./AdminPanel').NavbarContent;
  global: import('./AdminPanel').GlobalSettings;
  currentUser: UserType | null;
  isAuthLoading: boolean;
  totalItems: number;
  onCartClick: () => void;
  onAdminClick: () => void;
  onUserOrdersClick: () => void;
  onAuthClick: () => void;
  onLogout: () => void;
  onHomeClick: () => void;
  onCurrencyChange: () => void;
  currency: string;
}

function Navbar({ navbar, global: _global, currentUser, isAuthLoading, totalItems, onCartClick, onAdminClick, onUserOrdersClick, onAuthClick, onLogout, onHomeClick }: NavbarProps) {
  const { currency, setCurrency } = useCurrency();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getShadowClass = () => {
    if (navbar.isTransparent && !scrolled) return '';
    switch (navbar.shadow) {
      case 'small': return 'shadow-sm';
      case 'medium': return 'shadow-md';
      case 'large': return 'shadow-lg';
      default: return '';
    }
  };

  const navStyle: React.CSSProperties = {
    backgroundColor: navbar.isTransparent && !scrolled && !navbar.isFloating 
      ? 'transparent' 
      : (navbar.bgColor || '#fdfbf7'),
    color: navbar.textColor || '#2d2d2d',
    height: `${navbar.height || 64}px`,
    position: navbar.position === 'static' ? 'relative' : 'sticky',
    top: navbar.isFloating ? '12px' : 0,
    borderRadius: navbar.isFloating ? `${navbar.borderRadius || 32}px` : 0,
    margin: navbar.isFloating ? '0 auto' : 0,
    maxWidth: navbar.isFloating ? 'calc(100% - 48px)' : undefined,
    zIndex: 40,
  };

  const currencies: Record<string, string> = {
    'USD': '$', 'SGD': 'S$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'KRW': '₩'
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCurrency(val, currencies[val] || '$');
  };

  return (
    <nav 
      className={`transition-all duration-300 ${getShadowClass()}`}
      style={navStyle}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full relative">
        <div className="flex items-center justify-between h-full">
          {/* Desktop — Left: Logo + Links */}
          <div className="hidden md:flex items-center gap-6 flex-1">
            {/* Logo */}
            {navbar.showLogo !== false && (
              <button
                onClick={onHomeClick}
                className="hover:scale-105 transition-transform duration-300 flex-shrink-0"
              >
                <PatchuuLogo height={40} />
              </button>
            )}

            {/* Navigation Links */}
            {(navbar.links || []).map((link) => (
              <button
                key={link.id || link.url}
                onClick={() => {
                  if (link.url.startsWith('#')) {
                    onHomeClick();
                    setTimeout(() => {
                      const el = document.querySelector(link.url);
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  } else if (link.url.startsWith('http')) {
                    window.open(link.url, '_blank');
                  } else {
                    window.location.href = link.url;
                  }
                }}
                className="text-sm font-medium hover:opacity-70 transition-opacity"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop — Right: Currency + Auth + Cart */}
          <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
            {/* Currency Selector */}
            <div className="flex flex-col items-end">
              <select
                value={currency.toUpperCase()}
                onChange={handleCurrencyChange}
                className="px-2 py-1 rounded-lg border border-ink/10 bg-cardstock text-sm font-medium text-ink focus:border-craft-mint outline-none cursor-pointer"
                aria-label="Select currency"
              >
              <option value="USD">USD ($)</option>
              <option value="SGD">SGD (S$)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="KRW">KRW (₩)</option>
              </select>
              <span className="text-[10px] text-ink/40 mt-0.5">Converted at current rates</span>
            </div>

            {/* Auth Loading */}
            {isAuthLoading ? (
              <div className="w-5 h-5 border-2 border-pink/30 border-t-pink rounded-full animate-spin" />
            ) : (
              <>
                {/* Admin Button */}
                {currentUser?.role === 'admin' && (
                  <button 
                    onClick={onAdminClick}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors"
                    title="Admin Panel"
                    aria-label="Open admin panel"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                )}

                {/* User Actions */}
                {currentUser ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onUserOrdersClick}
                      className="p-2 hover:bg-black/5 rounded-full transition-colors"
                      title="My Orders"
                    >
                      <Package className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-semibold">{currentUser.name}</span>
                    <button onClick={onLogout} className="p-2 hover:bg-black/5 rounded-full transition-colors" aria-label="Log out">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={onAuthClick} className="p-2 hover:bg-black/5 rounded-full transition-colors" aria-label="Sign in">
                    <User className="w-5 h-5" />
                  </button>
                )}
              </>
            )}

            {/* Cart Button */}
            {navbar.showCart !== false && (
              <button
                onClick={onCartClick}
                className="relative p-2 hover:bg-black/5 rounded-full transition-colors"
                aria-label={`Shopping cart with ${totalItems} items`}
              >
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-craft-mint text-ink text-xs rounded-full flex items-center justify-center font-bold animate-bounce border-[1.5px] border-ink">
                    {totalItems}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Mobile — Left: Logo */}
          <div className="flex md:hidden items-center">
            {navbar.showLogo !== false && (
              <button
                onClick={onHomeClick}
                className="hover:scale-105 transition-transform duration-300"
              >
                <PatchuuLogo height={36} />
              </button>
            )}
          </div>

          {/* Mobile — Right: Cart + Menu */}
          <div className="flex items-center gap-2 md:hidden">
            {navbar.showCart !== false && (
              <button 
                onClick={onCartClick}
                className="relative p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-craft-mint text-ink text-xs rounded-full flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </button>
            )}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div 
          className="md:hidden absolute top-full left-0 right-0 mt-2 mx-4 rounded-2xl shadow-xl overflow-hidden"
          style={{ backgroundColor: navbar.bgColor || '#fdfbf7' }}
        >
          <div className="py-2">
            {/* Mobile Links */}
            {(navbar.links || []).map((link) => (
              <button
                key={link.id || link.url}
                onClick={() => {
                  setIsMenuOpen(false);
                  if (link.url.startsWith('#')) {
                    onHomeClick();
                    setTimeout(() => {
                      const el = document.querySelector(link.url);
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  } else if (link.url.startsWith('http')) {
                    window.open(link.url, '_blank');
                  } else {
                    window.location.href = link.url;
                  }
                }}
                className="w-full text-left px-6 py-3 text-sm font-medium hover:bg-black/5 transition-colors"
              >
                {link.label}
              </button>
            ))}
            
            {/* Mobile Currency */}
            <div className="px-6 py-2 border-t border-gray-100">
              <select
                value={currency.toUpperCase()}
                onChange={handleCurrencyChange}
                className="w-full px-3 py-2 rounded-lg border border-ink/10 text-sm bg-cardstock text-ink"
              >
                <option value="USD">USD ($)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="KRW">KRW (₩)</option>
              </select>
            </div>

            {/* Mobile Auth */}
            <div className="border-t border-gray-100 px-6 py-2">
              {currentUser ? (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-semibold">{currentUser.name}</span>
                  <div className="flex gap-2">
                    {currentUser.role === 'admin' && (
                      <button onClick={() => { setIsMenuOpen(false); onAdminClick(); }} className="p-2 hover:bg-black/5 rounded-full">
                        <Settings className="w-5 h-5" />
                      </button>
                    )}
                    <button onClick={() => { setIsMenuOpen(false); onUserOrdersClick(); }} className="p-2 hover:bg-black/5 rounded-full">
                      <Package className="w-5 h-5" />
                    </button>
                    <button onClick={() => { setIsMenuOpen(false); onLogout(); }} className="p-2 hover:bg-black/5 rounded-full">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setIsMenuOpen(false); onAuthClick(); }} className="flex items-center gap-2 py-2 text-sm font-medium">
                  <User className="w-5 h-5" /> Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// Main App Content
function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Track auth initialization


  const [showAuth, setShowAuth] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');

  type AppAdminTab = 'products' | 'patches' | 'orders' | 'inventory' | 'pages' | 'global' | 'tests';
  const [adminTab, setAdminTab] = useState<AppAdminTab>('products');
  const [showUserOrders, setShowUserOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [patches, setPatches] = useState<Patch[]>(initialPatches);

  const { totalItems, setIsCartOpen } = useCart();

  const [siteContent, setSiteContent] = useState<SiteContent>({
    landingPage: [
      {
        id: 'sec-hero',
        type: 'hero',
        visible: true,
        content: {
          slides: [
            { id: 'hero-1', title: 'New Summer\nCollection', subtitle: 'Check out our new fruit-themed patches — strawberries, watermelons, and more!', image: '/tote-bag.png' },
            { id: 'hero-2', title: 'Design Your\nOwn Style', subtitle: 'Pick your item, choose your patches, and make it uniquely yours.', image: '/pouch-beige.png' },
          ],
          ctaText: 'Start Designing',
        },
      },
      {
        id: 'sec-how',
        type: 'howItWorks',
        visible: true,
        content: {
          sectionTitle: 'How It Works',
          steps: [
            { id: 'step-1', title: 'Pick Your Item', description: 'Select your tote bag, fan or any blank item you want.', image: '/tote-bag.png', emoji: '' },
            { id: 'step-2', title: 'Choose Patches', description: 'Choose your cute patches and add your picks.', image: '', emoji: '' },
            { id: 'step-3', title: 'We Press It', description: 'We press a heat press to affix your custom artwork.', image: '/cardholder-yellow.png', emoji: '' },
          ],
        },
      },
      {
        id: 'sec-gallery',
        type: 'gallery',
        visible: true,
        content: {
          sectionTitle: 'Featured Creations',
          items: [
            { id: 'g1', image: '/tote-bag.png', label: 'Custom Tote Bag' },
            { id: 'g2', image: '/pouch-beige.png', label: 'Designer Pouch' },
            { id: 'g3', image: '/cardholder-yellow.png', label: 'Card Holder' },
            { id: 'g4', image: '/keychain-strap-blue.png', label: 'Blue Keychain' },
            { id: 'g5', image: '/keychain-strap-purple.png', label: 'Purple Keychain' },
          ],
        },
      },
    ],
    footer: {
      brandName: 'Patchuu',
      tagline: 'Create your own unique accessories!',
      copyright: '© 2025 Patchuu. Made with 💕 in Seoul',
      instagramUrl: '#',
      facebookUrl: '#',
      twitterUrl: '#',
    },
    global: {
      logoText: 'Patchuu',
      logoImage: '/hero/patchuu-logo.png',
      primaryColor: '#2d2d2d',
      secondaryColor: '#81c784',
      headingFont: 'Outfit',
      bodyFont: 'Inter',
      currency: 'USD',
      currencySymbol: '$',
    },
    customizePage: {
      step1Title: 'Choose Your Product',
      step1Subtitle: 'Pick the perfect base for your custom creation',
      step2PanelTitle: 'Design Your Creation',
      step3Title: 'Your Design is Ready!',
      step3Subtitle: 'Review your custom creation before adding to cart',
      howToDesignSteps: [
        'Drag patches from the panel onto your product',
        'Resize and reposition patches as you like',
        'Remove patches by clicking the × button',
      ],
    },
    navbar: {
      links: [
        { label: 'Home', url: '#home', id: 'nav-home' },
        { label: 'Gallery', url: '#gallery', id: 'nav-gallery' },
        { label: 'Design', url: '#design', id: 'nav-design' },
      ],
      showLogo: true,
      showCart: true,
      bgColor: '#fdfbf7',
      textColor: '#2d2d2d',
      isFloating: false,
      isTransparent: false,
      position: 'fixed',
      height: 64,
      borderRadius: 0,
      shadow: 'small',
      wrapperBgColor: 'transparent', // Default transparent background
    },
  });

  // ============================================
  // STATIC CMS DATA LOADING (Build-time exported)
  // Fast, no DB hits, CDN-cached
  // ============================================
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [usingStaticCms, setUsingStaticCms] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const loadCmsData = async () => {
      try {
        // Set a timeout to force loading complete after 5 seconds
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('⏱️ CMS loading timeout - forcing complete');
            setIsDataLoading(false);
          }
        }, 5000);

        // Check if we have static CMS files
        const hasStatic = await hasStaticCms();
        
        if (mounted) {
          setUsingStaticCms(hasStatic);
        }

        // Load all CMS data
        // Always load from Supabase (forceRefresh=true) to see latest changes immediately
        // This ensures admin panel changes appear on the live site without needing a rebuild
        const { siteContent: sc, products: prods, patches: patcs } = await preloadCmsData(true);

        if (!mounted) return;

        // Process and set products
        if (prods && prods.length > 0) {
          const frontendProducts = prods.map((p: DbProduct) => ({
            id: p.id,
            name: p.name,
            frontImage: p.front_image_url,
            backImage: p.back_image_url,
            basePrice: Number(p.base_price),
            quantity: p.quantity ?? 0,
            width: p.width,
            height: p.height,
            placementZone: p.placement_zone || { x: 15, y: 25, width: 70, height: 60, type: 'rectangle' },
            cropZone: p.crop_zone,
          }));
          setProducts(frontendProducts);
        }

        // Process and set patches
        if (patcs && patcs.length > 0) {
          const frontendPatches = patcs.map((p: DbPatch) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            image: p.image_url,
            price: Number(p.price),
            quantity: p.quantity ?? 0,
            width: p.width,
            height: p.height,
            contentZone: p.content_zone,
          }));
          setPatches(frontendPatches);
        }

        // Process and set site content
        if (sc) {
          // Ensure all items have IDs for stability
          const landingPage = (sc.landing_page || []).map((section: any) => {
            if (section.type === 'hero') {
              section.content.slides = (section.content.slides || []).map((s: any) => ({ ...s, id: s.id || uuidv4() }));
            } else if (section.type === 'howItWorks') {
              section.content.steps = (section.content.steps || []).map((s: any) => ({ ...s, id: s.id || uuidv4() }));
            } else if (section.type === 'gallery') {
              section.content.items = (section.content.items || []).map((i: any) => ({ ...i, id: i.id || uuidv4() }));
            } else if (section.type === 'testimonials') {
              section.content.items = (section.content.items || []).map((i: any) => ({ ...i, id: i.id || uuidv4() }));
            }
            return section;
          });

          // Check if data exists (not just specific fields) to handle partial updates
          const hasLandingPage = sc.landing_page && Array.isArray(sc.landing_page) && sc.landing_page.length > 0;
          const hasFooter = sc.footer && typeof sc.footer === 'object';
          const hasGlobal = sc.global_settings && typeof sc.global_settings === 'object';
          const hasCustomize = sc.customize_page && typeof sc.customize_page === 'object';
          const hasNavbar = sc.navbar && typeof sc.navbar === 'object';
          
          setSiteContent({
            landingPage: hasLandingPage ? landingPage : siteContent.landingPage,
            footer: (hasFooter ? sc.footer : siteContent.footer) as SiteContent['footer'],
            global: (hasGlobal ? sc.global_settings : siteContent.global) as SiteContent['global'],
            customizePage: (hasCustomize ? sc.customize_page : siteContent.customizePage) as SiteContent['customizePage'],
            navbar: (hasNavbar ? sc.navbar : siteContent.navbar) as SiteContent['navbar'],
          });
        }

        console.log(`✅ CMS loaded: ${hasStatic ? 'static files' : 'Supabase (dev mode)'}`);
      } catch (err) {
        console.error('Failed to load CMS data:', err);
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          setIsDataLoading(false);
        }
      }
    };

    loadCmsData();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Consolidate auth listener and session check
  useEffect(() => {
    let mounted = true;

    const handleUserAuthenticated = async (user: any, isInstant = false) => {
      // Role should be in user_metadata from the updated signIn flow
      // For existing sessions, try to get it from the database
      let userRole = user.user_metadata?.role as 'user' | 'admin' | undefined;
      
      // If no role in metadata (legacy sessions), fetch it once
      if (!userRole) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (profile?.role) {
            userRole = profile.role;
            // Update the JWT metadata for next time
            await supabase.auth.updateUser({
              data: { role: profile.role }
            });
          }
        } catch (err) {
          console.warn('App: Could not fetch role, defaulting to user');
        }
      }
      
      const baseUser = {
        id: user.id,
        email: user.email || '',
        role: userRole || 'user',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      };
      
      console.log('App: Setting user:', baseUser.email, 'Role:', baseUser.role, isInstant ? '(instant)' : '(validated)');
      
      if (mounted) {
        setCurrentUser(baseUser);
        setShowAuth(false);
        setIsAuthLoading(false);
      }
    };

    const initAuth = async () => {
      console.log('App: Initializing Auth...');
      
      // STEP 1: Try to get session from localStorage instantly (< 50ms)
      try {
        const cachedSession = localStorage.getItem('patchpress-auth');
        if (cachedSession) {
          const parsed = JSON.parse(cachedSession);
          const session = parsed?.session;
          if (session?.user && mounted) {
            console.log('App: Found cached session, showing user instantly');
            // Show user immediately without waiting for network
            await handleUserAuthenticated(session.user, true);
          }
        }
      } catch (e) {
        console.warn('App: Failed to read cached session:', e);
      }
      
      // STEP 2: Validate session with server (may take 1-3s)
      try {
        const { data: { session }, error: sessionError } = await auth.getSession();
        
        if (sessionError) {
          console.error('App: Session validation error:', sessionError);
          if (mounted) {
            setCurrentUser(null);
            setCurrentView('landing');
          }
          return;
        }

        if (mounted) {
          if (session?.user) {
            console.log('App: Session validated:', session.user.email);
            await handleUserAuthenticated(session.user, false);
          } else {
            console.log('App: No valid session on server.');
            setCurrentUser(null);
            setCurrentView('landing');
          }
        }
      } catch (err) {
        console.error('App: Auth validation error:', err);
        // Keep cached user if validation fails (offline mode)
        if (!currentUser && mounted) {
          setCurrentUser(null);
          setCurrentView('landing');
        }
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    };

    initAuth();

    const { data: authListener } = auth.onAuthStateChange(async (event, session) => {
      console.log('App: Auth Event:', event, 'User:', session?.user?.email);

      if (mounted) {
        if (session?.user) {
          try {
            await handleUserAuthenticated(session.user, false);
            
            // Check if user was trying to checkout before login
            const pendingCheckout = localStorage.getItem('pending_checkout');
            if (pendingCheckout === 'true' && event === 'SIGNED_IN') {
              localStorage.removeItem('pending_checkout');
              // Open cart and show checkout
              setIsCartOpen(true);
            }
          } catch (err) {
            console.error('App: Error in auth state change handler:', err);
          } finally {
            setIsAuthLoading(false);
          }
        } else {
          setCurrentUser(null);
          setCurrentView('landing');
          setIsAuthLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  // Debug: Log auth state changes
  useEffect(() => {
    console.log('App: Auth state changed:', { 
      isAuthLoading, 
      hasUser: !!currentUser, 
      userRole: currentUser?.role 
    });
  }, [isAuthLoading, currentUser]);

  const handleLogout = async () => {
    await auth.signOut();
    setCurrentUser(null);
    setCurrentView('landing');
  };

  // Refresh CMS data after admin updates (force refresh from Supabase)
  const refreshCmsData = async () => {
    console.log('🔄 Refreshing CMS data from Supabase...');
    setIsDataLoading(true);
    
    try {
      // Clear cache to force reload
      clearCmsCache();
      
      // Reload all data with forceRefresh=true to bypass static files
      // This ensures localhost and Vercel see the same content
      const { siteContent: sc, products: prods, patches: patcs } = await preloadCmsData(true);

      // Update products
      if (prods && prods.length > 0) {
        const frontendProducts = prods.map((p: DbProduct) => ({
          id: p.id,
          name: p.name,
          frontImage: p.front_image_url,
          backImage: p.back_image_url,
          basePrice: Number(p.base_price),
          quantity: p.quantity ?? 0,
          width: p.width,
          height: p.height,
          placementZone: p.placement_zone || { x: 15, y: 25, width: 70, height: 60, type: 'rectangle' },
          cropZone: p.crop_zone,
        }));
        setProducts(frontendProducts);
      }

      // Update patches
      if (patcs && patcs.length > 0) {
        const frontendPatches = patcs.map((p: DbPatch) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          image: p.image_url,
          price: Number(p.price),
          quantity: p.quantity ?? 0,
          width: p.width,
          height: p.height,
          contentZone: p.content_zone,
        }));
        setPatches(frontendPatches);
      }

      // Update site content
      if (sc) {
        const landingPage = (sc.landing_page || []).map((section: any) => {
          if (section.type === 'hero') {
            section.content.slides = (section.content.slides || []).map((s: any) => ({ ...s, id: s.id || uuidv4() }));
          } else if (section.type === 'howItWorks') {
            section.content.steps = (section.content.steps || []).map((s: any) => ({ ...s, id: s.id || uuidv4() }));
          } else if (section.type === 'gallery') {
            section.content.items = (section.content.items || []).map((i: any) => ({ ...i, id: i.id || uuidv4() }));
          } else if (section.type === 'testimonials') {
            section.content.items = (section.content.items || []).map((i: any) => ({ ...i, id: i.id || uuidv4() }));
          }
          return section;
        });

        // Check if data exists (not just specific fields) to handle partial updates
        const hasLandingPage = sc.landing_page && Array.isArray(sc.landing_page) && sc.landing_page.length > 0;
        const hasFooter = sc.footer && typeof sc.footer === 'object';
        const hasGlobal = sc.global_settings && typeof sc.global_settings === 'object';
        const hasCustomize = sc.customize_page && typeof sc.customize_page === 'object';
        const hasNavbar = sc.navbar && typeof sc.navbar === 'object'; // Check if navbar exists (not just links)
        
        setSiteContent({
          landingPage: hasLandingPage ? landingPage : siteContent.landingPage,
          footer: (hasFooter ? sc.footer : siteContent.footer) as SiteContent['footer'],
          global: (hasGlobal ? sc.global_settings : siteContent.global) as SiteContent['global'],
          customizePage: (hasCustomize ? sc.customize_page : siteContent.customizePage) as SiteContent['customizePage'],
          navbar: (hasNavbar ? sc.navbar : siteContent.navbar) as SiteContent['navbar'],
        });
      }

      console.log('✅ CMS data refreshed');
      return true;
    } catch (err) {
      console.error('❌ Failed to refresh CMS data:', err);
      return false;
    } finally {
      setIsDataLoading(false);
    }
  };

  // Listen for CMS update events from admin panel
  useEffect(() => {
    const handleCmsUpdate = () => {
      console.log('🔄 CMS update detected, refreshing...');
      refreshCmsData();
    };
    
    window.addEventListener('cms-updated', handleCmsUpdate);
    return () => window.removeEventListener('cms-updated', handleCmsUpdate);
  }, []);

  const startCustomizing = () => { setCurrentView('customize'); };

  return (
    <div
      className="min-h-screen bg-paper font-body overflow-x-hidden"
      style={{
        ['--font-heading' as any]: siteContent.global.headingFont === '210-Claytoy' 
          ? "'210-Claytoy', 'Quicksand', sans-serif" 
          : `'${siteContent.global.headingFont || 'Outfit'}', 'Quicksand', sans-serif`,
        ['--font-body' as any]: `'${siteContent.global.bodyFont || 'Inter'}', 'Nunito', sans-serif`,
      }}
    >
      {/* Context7 Best Practice: Skip link for keyboard accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      {/* Customizable Navbar */}
      <Navbar 
        navbar={siteContent.navbar}
        global={siteContent.global}
        currentUser={currentUser}
        isAuthLoading={isAuthLoading}
        totalItems={totalItems}
        onCartClick={() => setIsCartOpen(true)}
        onAdminClick={() => setCurrentView('admin')}
        onUserOrdersClick={() => setShowUserOrders(true)}
        onAuthClick={() => setShowAuth(true)}
        onLogout={handleLogout}
        onHomeClick={() => setCurrentView('landing')}
        onCurrencyChange={() => {}}
        currency={siteContent.global.currency || 'USD'}
      />

      <AuthModal
        showAuth={showAuth}
        setShowAuth={setShowAuth}
        authView={authView}
        setAuthView={setAuthView}
      />

      <CartDrawer 
        currentUser={currentUser}
        setShowAuth={setShowAuth}
        setAuthView={setAuthView}
      />

      <UserOrdersModal
        show={showUserOrders}
        onClose={() => setShowUserOrders(false)}
        userId={currentUser?.id || ''}
        onViewOrder={(orderId) => {
          setSelectedOrderId(orderId);
          setCurrentView('order-detail');
        }}
      />

      {/* Full-screen loading overlay to prevent flash of default content */}
      {isDataLoading && (
        <div className="fixed inset-0 z-[60] bg-paper flex flex-col items-center justify-center gap-4">
          <PatchuuLogo height={80} className="animate-pulse" />
          <div className="w-6 h-6 border-2 border-cardstock border-t-craft-mint rounded-full animate-spin" />
        </div>
      )}

      {/* Context7 Best Practice: Main content landmark with id for skip link */}
      <main 
        id="main-content" 
        className="outline-none"
        style={{
          // Add padding-top when navbar is sticky/fixed to prevent content from going behind it
          paddingTop: siteContent.navbar?.position !== 'static' 
            ? `${(siteContent.navbar?.height || 64) + (siteContent.navbar?.isFloating ? 12 : 0)}px` 
            : 0
        }}
      >
        {currentView === 'landing' && (
          <div style={{ backgroundColor: siteContent.navbar?.wrapperBgColor || 'transparent' }}>
            <LandingPage 
              startCustomizing={startCustomizing} 
              siteContent={siteContent}
              onNavigateToLegal={(page) => setCurrentView(page)}
            />
          </div>
        )}
        {currentView === 'customize' && (
          <CustomizePage
            products={products}
            patches={patches}
            setCurrentView={setCurrentView}
            siteContent={siteContent}
          />
        )}
        {currentView === 'order-detail' && selectedOrderId && (
          <OrderDetailPage
            orderId={selectedOrderId}
            onBack={() => {
              setCurrentView('landing');
              setSelectedOrderId(null);
            }}
          />
        )}
        {currentView === 'admin' && currentUser?.role === 'admin' && (
          <div className="min-h-screen bg-gray-50">
            <AdminPanel
              showAdmin={true}
              setShowAdmin={() => setCurrentView('landing')}
              adminTab={adminTab as import('./AdminPanel').AdminTab}
              setAdminTab={setAdminTab as (tab: import('./AdminPanel').AdminTab) => void}
              products={products}
              setProducts={setProducts}
              patches={patches}
              setPatches={setPatches}
              siteContent={siteContent}
              setSiteContent={setSiteContent}
              onContentSaved={refreshCmsData}
              usingStaticCms={usingStaticCms}
              currentUser={currentUser}
            />
          </div>
        )}
        {currentView === 'admin' && currentUser?.role !== 'admin' && (
          <div className="min-h-screen bg-paper flex items-center justify-center px-4">
            <div className="bg-cardstock rounded-2xl p-8 shadow-paper max-w-md w-full text-center">
              <div className="w-16 h-16 bg-craft-rose/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-craft-rose" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-ink mb-2">Access Denied</h2>
              <p className="text-ink-muted mb-6">You don't have permission to access the admin panel.</p>
              <button
                onClick={() => setCurrentView('landing')}
                className="px-6 py-2.5 bg-ink text-white rounded-xl font-semibold hover:bg-ink/90 transition-colors"
              >
                Go Back Home
              </button>
            </div>
          </div>
        )}
        {currentView === 'privacy' && (
          <PrivacyPolicyPage 
            onBack={() => setCurrentView('landing')}
            brandName={siteContent.global?.logoText || 'Patch & Press'}
          />
        )}
        {currentView === 'terms' && (
          <TermsOfServicePage 
            onBack={() => setCurrentView('landing')}
            brandName={siteContent.global?.logoText || 'Patch & Press'}
          />
        )}
        {currentView === 'refund' && (
          <RefundPolicyPage 
            onBack={() => setCurrentView('landing')}
            brandName={siteContent.global?.logoText || 'Patch & Press'}
          />
        )}
        {currentView === 'shipping' && (
          <ShippingPolicyPage 
            onBack={() => setCurrentView('landing')}
            brandName={siteContent.global?.logoText || 'Patch & Press'}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <CurrencyProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </CurrencyProvider>
  );
}

export default App;
