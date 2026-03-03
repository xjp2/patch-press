import { useState, useEffect } from 'react';
import { Palette, LogOut, Settings, User, ShoppingCart, X, Plus, Minus, Trash2, Loader2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { loadStripe } from '@stripe/stripe-js';
import './App.css';
import { AuthModal } from './AuthModal';
import type { UserType, AuthView } from './AuthModal';
import { AdminPanel } from './AdminPanel';
import type { Notice, Product, Patch, SiteContent } from './AdminPanel';
import { LandingPage } from './LandingPage';
import { CustomizePage } from './CustomizePage';
import { CartProvider, useCart } from './context/CartContext';
import supabase, { auth } from './lib/supabase';
import { preloadCmsData, clearCmsCache, hasStaticCms } from './lib/cms';
import type { Product as DbProduct, Patch as DbPatch } from './lib/cms';

type AppView = 'landing' | 'customize';
type AdminTab = 'products' | 'patches' | 'orders' | 'pages' | 'global';

const initialPatches: Patch[] = [
  { id: '1', name: 'Fried Egg', category: 'food', image: '/patch-egg.png', price: 3, width: 80, height: 80 },
  { id: '2', name: 'Burger', category: 'food', image: '/patch-burger.png', price: 4, width: 90, height: 90 },
  { id: '3', name: 'Fries', category: 'food', image: '/patch-fries.png', price: 3, width: 70, height: 90 },
  { id: '11', name: 'Beer', category: 'food', image: '/patch-beer.png', price: 3, width: 50, height: 90 },
  { id: '15', name: 'Ice Cream', category: 'food', image: '/patch-icecream.png', price: 3, width: 60, height: 100 },
  { id: '16', name: 'Watermelon', category: 'food', image: '/patch-watermelon.png', price: 3, width: 90, height: 70 },
  { id: '17', name: 'Pizza', category: 'food', image: '/patch-pizza.png', price: 3, width: 90, height: 90 },
  { id: '19', name: 'Strawberry', category: 'food', image: '/patch-strawberry.png', price: 3, width: 70, height: 80 },
  { id: '20', name: 'Banana', category: 'food', image: '/patch-banana.png', price: 3, width: 80, height: 70 },
  { id: '21', name: 'Donut', category: 'food', image: '/patch-donut.png', price: 3, width: 80, height: 80 },
  { id: '22', name: 'Croissant', category: 'food', image: '/patch-croissant.png', price: 3, width: 90, height: 70 },
  { id: '23', name: 'Cupcake', category: 'food', image: '/patch-cupcake.png', price: 3, width: 70, height: 90 },
  { id: '24', name: 'Boba Tea', category: 'food', image: '/patch-boba.png', price: 4, width: 60, height: 100 },
  { id: '25', name: 'Coffee', category: 'food', image: '/patch-coffee.png', price: 3, width: 70, height: 90 },
  { id: '26', name: 'Milk', category: 'food', image: '/patch-milk.png', price: 3, width: 60, height: 90 },
  { id: '27', name: 'Lemon', category: 'food', image: '/patch-lemon.png', price: 3, width: 80, height: 70 },
  { id: '28', name: 'Peach', category: 'food', image: '/patch-peach.png', price: 3, width: 80, height: 80 },
  { id: '29', name: 'Cherry', category: 'food', image: '/patch-cherry.png', price: 3, width: 80, height: 80 },
  { id: '7', name: 'Cat', category: 'characters', image: '/patch-cat.png', price: 4, width: 90, height: 90 },
  { id: '8', name: 'Dog', category: 'characters', image: '/patch-dog.png', price: 4, width: 90, height: 90 },
  { id: '14', name: 'Bear', category: 'characters', image: '/patch-bear.png', price: 4, width: 90, height: 90 },
  { id: '18', name: 'Cactus', category: 'characters', image: '/patch-cactus.png', price: 4, width: 70, height: 100 },
  { id: '30', name: 'Panda', category: 'characters', image: '/patch-panda.png', price: 4, width: 90, height: 90 },
  { id: '31', name: 'Rabbit', category: 'characters', image: '/patch-rabbit.png', price: 4, width: 80, height: 100 },
  { id: '32', name: 'Hamster', category: 'characters', image: '/patch-hamster.png', price: 4, width: 90, height: 90 },
  { id: '33', name: 'Penguin', category: 'characters', image: '/patch-penguin.png', price: 4, width: 70, height: 100 },
  { id: '34', name: 'Chick', category: 'characters', image: '/patch-chick.png', price: 4, width: 80, height: 90 },
  { id: '9', name: 'Letter S', category: 'letters', image: '/patch-letter-s.png', price: 2, width: 70, height: 90 },
  { id: '10', name: 'Letter J', category: 'letters', image: '/patch-letter-j.png', price: 2, width: 70, height: 90 },
  { id: '4', name: 'Pink Bow', category: 'symbols', image: '/patch-bow.png', price: 2, width: 90, height: 70 },
  { id: '5', name: 'Rainbow', category: 'symbols', image: '/patch-rainbow.png', price: 3, width: 100, height: 70 },
  { id: '6', name: 'Heart', category: 'symbols', image: '/patch-heart.png', price: 2, width: 80, height: 80 },
  { id: '12', name: 'Car', category: 'symbols', image: '/patch-car.png', price: 4, width: 100, height: 70 },
  { id: '13', name: 'Star', category: 'symbols', image: '/patch-star.png', price: 2, width: 90, height: 90 },
  { id: '35', name: 'Flower', category: 'symbols', image: '/patch-flower.png', price: 3, width: 80, height: 80 },
  { id: '36', name: 'Sunflower', category: 'symbols', image: '/patch-sunflower.png', price: 3, width: 90, height: 90 },
  { id: '37', name: 'Tulip', category: 'symbols', image: '/patch-tulip.png', price: 3, width: 70, height: 90 },
  { id: '38', name: 'Clover', category: 'symbols', image: '/patch-clover.png', price: 2, width: 80, height: 80 },
  { id: '39', name: 'Butterfly', category: 'symbols', image: '/patch-butterfly.png', price: 3, width: 100, height: 80 },
  { id: '40', name: 'Bee', category: 'symbols', image: '/patch-bee.png', price: 3, width: 90, height: 80 },
  { id: '41', name: 'Music Note', category: 'symbols', image: '/patch-music.png', price: 2, width: 60, height: 90 },
  { id: '42', name: 'Lightning', category: 'symbols', image: '/patch-lightning.png', price: 2, width: 60, height: 100 },
];

const initialProducts: Product[] = [
  { id: 'tote', name: 'Canvas Tote', frontImage: '/tote-bag.png', backImage: '/tote-bag.png', basePrice: 25, width: 400, height: 500, placementZone: { x: 15, y: 25, width: 70, height: 60, type: 'rectangle' } },
  { id: 'keychain-blue', name: 'Blue Keychain', frontImage: '/keychain-strap-blue.png', backImage: '/keychain-strap-blue.png', basePrice: 12, width: 300, height: 100, placementZone: { x: 10, y: 20, width: 80, height: 60, type: 'rectangle' } },
  { id: 'keychain-purple', name: 'Purple Keychain', frontImage: '/keychain-strap-purple.png', backImage: '/keychain-strap-purple.png', basePrice: 12, width: 300, height: 100, placementZone: { x: 10, y: 20, width: 80, height: 60, type: 'rectangle' } },
  { id: 'keychain-white', name: 'White Keychain', frontImage: '/keychain-strap-white.png', backImage: '/keychain-strap-white.png', basePrice: 12, width: 300, height: 100, placementZone: { x: 10, y: 20, width: 80, height: 60, type: 'rectangle' } },
  { id: 'pouch', name: 'Beige Pouch', frontImage: '/pouch-beige.png', backImage: '/pouch-beige.png', basePrice: 18, width: 350, height: 250, placementZone: { x: 15, y: 20, width: 70, height: 65, type: 'rectangle' } },
  { id: 'cardholder', name: 'Cardholder', frontImage: '/cardholder-yellow.png', backImage: '/cardholder-yellow.png', basePrice: 15, width: 300, height: 200, placementZone: { x: 10, y: 15, width: 80, height: 70, type: 'rectangle' } },
];

const initialNotices: Notice[] = [
  { id: '1', title: 'New Summer Collection!', content: 'Check out our new fruit-themed patches - strawberries, watermelons, and more!', date: '2025-02-14', type: 'new-product' },
  { id: '2', title: 'Free Shipping', content: 'Get free shipping on orders over $50! Use code FREESHIP at checkout.', date: '2025-02-10', type: 'promotion' }
];

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Cart Item Component with expandable details
function CartItemCard({ item, updateQuantity, removeItem }: { 
  item: import('./context/CartContext').CartItem; 
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalPatches = item.frontPatches.length + item.backPatches.length;
  const patchPrice = item.frontPatches.reduce((sum, p) => sum + p.price, 0) + item.backPatches.reduce((sum, p) => sum + p.price, 0);
  
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      {/* Main Preview Row */}
      <div className="flex gap-3">
        {/* Product Preview Image */}
        <div className="w-20 h-20 bg-white rounded-lg border flex-shrink-0 overflow-hidden">
          <img 
            src={item.productImage} 
            alt={item.productName}
            className="w-full h-full object-contain"
          />
        </div>
        
        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-sm">{item.productName}</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Base: ${item.basePrice.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {totalPatches} patch{totalPatches !== 1 ? 'es' : ''} (+${patchPrice.toFixed(2)})
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
        className="w-full flex items-center justify-center gap-1 py-2 mt-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {expanded ? 'Hide Details' : 'View Patches'}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-3">
          {/* Front Side Patches */}
          {item.frontPatches.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-gray-600 mb-2">Front Side</h5>
              <div className="space-y-1.5">
                {item.frontPatches.map((patch) => (
                  <div key={patch.id} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <img src={patch.image} alt={patch.name} className="w-6 h-6 object-contain" />
                      <span className="text-xs">{patch.name}</span>
                    </div>
                    <span className="text-xs font-medium">${patch.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back Side Patches */}
          {item.backPatches.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-gray-600 mb-2">Back Side</h5>
              <div className="space-y-1.5">
                {item.backPatches.map((patch) => (
                  <div key={patch.id} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <img src={patch.image} alt={patch.name} className="w-6 h-6 object-contain" />
                      <span className="text-xs">{patch.name}</span>
                    </div>
                    <span className="text-xs font-medium">${patch.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="pt-2 border-t border-gray-200 text-xs space-y-1">
            <div className="flex justify-between text-gray-500">
              <span>Base Product</span>
              <span>${item.basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Patches ({totalPatches})</span>
              <span>${patchPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-700 pt-1 border-t">
              <span>Item Total</span>
              <span>${item.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quantity & Price Controls */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            className="p-1 hover:bg-gray-200 rounded-full bg-white"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="p-1 hover:bg-gray-200 rounded-full bg-white"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <span className="font-bold">${(item.totalPrice * item.quantity).toFixed(2)}</span>
      </div>
    </div>
  );
}

// Cart Drawer Component
function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, totalPrice, totalItems, updateQuantity, removeItem, clearCart } = useCart();
  const [checkoutState, setCheckoutState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');

  const handleCheckout = async () => {
    setCheckoutState('processing');
    setCheckoutError('');
    try {
      // Amount in cents
      const amountInCents = Math.round(totalPrice * 100);

      // Create payment intent via Edge Function
      const { data: piData, error: piError } = await supabase.functions.invoke('create-payment-intent', {
        body: { amount: amountInCents, currency: 'usd' },
      });

      if (piError || !piData?.clientSecret) {
        throw new Error(piError?.message || 'Failed to create payment intent');
      }

      // NOTE: In production, you should use Stripe Elements for secure card input
      // For demo/testing, we'll use a test card token
      // In a real app, replace this with proper card element integration
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      // For development/testing only - in production, use Stripe Elements
      const { error: confirmError } = await stripe.confirmCardPayment(piData.clientSecret, {
        payment_method: {
          card: { token: 'tok_visa' }, // Test token - FOR DEVELOPMENT ONLY
        } as any,
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Save order to Supabase
      const { data: { session } } = await auth.getSession();
      if (session?.user) {
        await supabase.from('orders').insert({
          user_id: session.user.id,
          customer_email: session.user.email,
          items: items.map(i => ({ 
            name: i.productName, 
            patches: [...i.frontPatches, ...i.backPatches].map(p => p.name), 
            qty: i.quantity, 
            price: i.totalPrice 
          })),
          total_amount: totalPrice,
          status: 'paid',
          payment_intent_id: piData.clientSecret.split('_secret_')[0],
        });
      }

      setCheckoutState('success');
      setTimeout(() => {
        clearCart();
        setCheckoutState('idle');
        setIsCartOpen(false);
      }, 2500);
    } catch (err: any) {
      setCheckoutError(err?.message || 'Checkout failed');
      setCheckoutState('error');
    }
  };

  if (!isCartOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Shopping Cart ({totalItems})</h2>
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
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
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            {checkoutError && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{checkoutError}</div>
            )}
            {checkoutState === 'success' ? (
              <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-semibold">
                <CheckCircle className="w-5 h-5" /> Payment Successful!
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={checkoutState === 'processing'}
                className={`w-full btn-primary py-3 flex items-center justify-center gap-2 ${checkoutState === 'processing' ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {checkoutState === 'processing' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  'Proceed to Checkout'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Main App Content
function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Track auth initialization

  const [showAuth, setShowAuth] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('products');

  const [notices] = useState<Notice[]>(initialNotices);
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
            { id: 'hero-1', title: 'New Summer\nCollection', subtitle: 'Check out our new fruit-themed patches — strawberries, watermelons, and more!', image: '/products/tote-bag.png' },
            { id: 'hero-2', title: 'Design Your\nOwn Style', subtitle: 'Pick your item, choose your patches, and make it uniquely yours.', image: '/products/pouch-beige.png' },
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
            { id: 'step-1', title: 'Pick Your Item', description: 'Select your tote bag, fan or any blank item you want.', image: '/products/tote-bag.png', emoji: '' },
            { id: 'step-2', title: 'Choose Patches', description: 'Choose your cute patches and add your picks.', image: '', emoji: '' },
            { id: 'step-3', title: 'We Press It', description: 'We press a heat press to affix your custom artwork.', image: '', emoji: '🔥' },
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
            { id: 'g1', image: '/products/tote-bag.png', label: 'Custom Tote Bag' },
            { id: 'g2', image: '/products/pouch-beige.png', label: 'Designer Pouch' },
            { id: 'g3', image: '/products/cardholder-yellow.png', label: 'Card Holder' },
            { id: 'g4', image: '/products/keychain-strap-blue.png', label: 'Blue Keychain' },
            { id: 'g5', image: '/products/keychain-strap-purple.png', label: 'Purple Keychain' },
          ],
        },
      },
    ],
    footer: {
      brandName: 'Patch & Press',
      tagline: 'Create your own unique accessories!',
      copyright: '© 2025 Patch & Press. Made with 💕 in Seoul',
      instagramUrl: '#',
      facebookUrl: '#',
      twitterUrl: '#',
    },
    global: {
      logoText: 'Patch & Press',
      logoImage: '',
      primaryColor: '#3a3530',
      secondaryColor: '#6b8f71',
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
  });

  // ============================================
  // STATIC CMS DATA LOADING (Build-time exported)
  // Fast, no DB hits, CDN-cached
  // ============================================
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [usingStaticCms, setUsingStaticCms] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCmsData = async () => {
      try {
        // Check if we have static CMS files
        const hasStatic = await hasStaticCms();
        
        if (mounted) {
          setUsingStaticCms(hasStatic);
        }

        // Load all CMS data (static or from Supabase)
        const { siteContent: sc, products: prods, patches: patcs } = await preloadCmsData();

        if (!mounted) return;

        // Process and set products
        if (prods && prods.length > 0) {
          const frontendProducts = prods.map((p: DbProduct) => ({
            id: p.id,
            name: p.name,
            frontImage: p.front_image_url,
            backImage: p.back_image_url,
            basePrice: Number(p.base_price),
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

          setSiteContent({
            landingPage: landingPage.length ? landingPage : siteContent.landingPage,
            footer: (sc.footer?.brandName ? sc.footer : siteContent.footer) as SiteContent['footer'],
            global: (sc.global_settings?.logoText ? sc.global_settings : siteContent.global) as SiteContent['global'],
            customizePage: (sc.customize_page?.step1Title ? sc.customize_page : siteContent.customizePage) as SiteContent['customizePage'],
          });
        }

        console.log(`✅ CMS loaded: ${hasStatic ? 'static files' : 'Supabase (dev mode)'}`);
      } catch (err) {
        console.error('Failed to load CMS data:', err);
      } finally {
        if (mounted) {
          setIsDataLoading(false);
        }
      }
    };

    loadCmsData();

    return () => {
      mounted = false;
    };
  }, []);

  // Consolidate auth listener and session check
  useEffect(() => {
    let mounted = true;

    const handleUserAuthenticated = async (user: any, isInstant = false) => {
      // Set user immediately with basic info (don't wait for profile)
      const baseUser = {
        id: user.id,
        email: user.email || '',
        role: (user.user_metadata?.role as 'user' | 'admin') || 'user',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      };
      
      console.log('App: Setting user:', baseUser.email, isInstant ? '(instant from cache)' : '(validated)');
      
      if (mounted) {
        setCurrentUser(baseUser);
        setShowAuth(false);
        // If instant, don't clear loading yet - wait for validation
        if (!isInstant) {
          setIsAuthLoading(false);
        }
      }
      
      // Try to fetch profile with timeout (don't block if it fails)
      try {
        const profilePromise = supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single();
          
        // 3 second timeout for profile fetch
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
        );
        
        const { data: profile, error: profileError } = await Promise.race([
          profilePromise,
          timeoutPromise
        ]) as any;

        if (profileError) {
          console.warn('App: Profile fetch error:', profileError);
        } else if (profile && mounted) {
          // Update with profile data if available
          console.log('App: Updating user with profile data');
          setCurrentUser({
            ...baseUser,
            role: profile.role || baseUser.role,
            name: profile.full_name || baseUser.name,
          });
        }
      } catch (err) {
        console.warn('App: Profile fetch failed (using defaults):', err);
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
            setShowAdmin(false);
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
            setShowAdmin(false);
          }
        }
      } catch (err) {
        console.error('App: Auth validation error:', err);
        // Keep cached user if validation fails (offline mode)
        if (!currentUser && mounted) {
          setCurrentUser(null);
          setShowAdmin(false);
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
          } catch (err) {
            console.error('App: Error in auth state change handler:', err);
          } finally {
            setIsAuthLoading(false);
          }
        } else {
          setCurrentUser(null);
          setShowAdmin(false);
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
    setShowAdmin(false);
  };

  // Refresh CMS data after admin updates (in dev mode, reloads from Supabase)
  const refreshCmsData = async () => {
    console.log('🔄 Refreshing CMS data...');
    setIsDataLoading(true);
    
    try {
      // Clear cache to force reload
      clearCmsCache();
      
      // Reload all data
      const { siteContent: sc, products: prods, patches: patcs } = await preloadCmsData();

      // Update products
      if (prods && prods.length > 0) {
        const frontendProducts = prods.map((p: DbProduct) => ({
          id: p.id,
          name: p.name,
          frontImage: p.front_image_url,
          backImage: p.back_image_url,
          basePrice: Number(p.base_price),
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

        setSiteContent({
          landingPage: landingPage.length ? landingPage : siteContent.landingPage,
          footer: (sc.footer?.brandName ? sc.footer : siteContent.footer) as SiteContent['footer'],
          global: (sc.global_settings?.logoText ? sc.global_settings : siteContent.global) as SiteContent['global'],
          customizePage: (sc.customize_page?.step1Title ? sc.customize_page : siteContent.customizePage) as SiteContent['customizePage'],
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

  const startCustomizing = () => { setCurrentView('customize'); };

  return (
    <div className="min-h-screen bg-cream font-body overflow-x-hidden">
      {/* Context7 Best Practice: Skip link for keyboard accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <nav className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('landing')}>
              {siteContent.global.logoImage ? (
                <img src={siteContent.global.logoImage} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 bg-pink rounded-full flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="font-heading text-xl font-bold text-text-dark">{siteContent.global.logoText || 'Patch & Press'}</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Currency Selector */}
              <select
                value={siteContent.global.currency || 'USD'}
                onChange={e => {
                  const currency = e.target.value;
                  const symbols: Record<string, string> = {
                    'USD': '$', 'SGD': 'S$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'KRW': '₩'
                  };
                  setSiteContent({
                    ...siteContent,
                    global: { ...siteContent.global, currency: currency as any, currencySymbol: symbols[currency] || '$' }
                  });
                }}
                className="hidden sm:block px-2 py-1 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:border-pink outline-none cursor-pointer"
                aria-label="Select currency"
              >
                <option value="USD">USD ($)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="KRW">KRW (₩)</option>
              </select>

              {/* Show loading spinner while auth is initializing */}
              {isAuthLoading ? (
                <div className="w-5 h-5 border-2 border-pink/30 border-t-pink rounded-full animate-spin" />
              ) : (
                <>
                  {currentUser?.role === 'admin' && (
                    <button onClick={() => setShowAdmin(true)} className="p-2 hover:bg-pink/20 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2" title="Admin Panel" aria-label="Open admin panel">
                      <Settings className="w-5 h-5 text-text-dark" aria-hidden="true" />
                    </button>
                  )}
                  {currentUser ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold hidden sm:block">{currentUser.name}</span>
                      <button onClick={handleLogout} className="p-2 hover:bg-pink/20 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2" aria-label="Log out">
                        <LogOut className="w-5 h-5 text-text-dark" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowAuth(true)} className="p-2 hover:bg-pink/20 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2" aria-label="Sign in">
                      <User className="w-5 h-5 text-text-dark" aria-hidden="true" />
                    </button>
                  )}
                </>
              )}
              {/* Context7 Best Practice: aria-label for icon buttons */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-pink/20 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2"
                aria-label={`Shopping cart with ${totalItems} items`}
              >
                <ShoppingCart className="w-6 h-6 text-text-dark" aria-hidden="true" />
                {totalItems > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce" aria-hidden="true">{totalItems}</span>}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AuthModal
        showAuth={showAuth}
        setShowAuth={setShowAuth}
        authView={authView}
        setAuthView={setAuthView}
      />

      <AdminPanel
        showAdmin={showAdmin}
        setShowAdmin={setShowAdmin}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        products={products}
        setProducts={setProducts}
        patches={patches}
        setPatches={setPatches}
        siteContent={siteContent}
        setSiteContent={setSiteContent}
        onContentSaved={refreshCmsData}
        usingStaticCms={usingStaticCms}
      />

      <CartDrawer />

      {/* Loading indicator for initial data fetch - non-blocking */}
      {isDataLoading && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-white/90 rounded-full shadow-lg flex items-center gap-2 cursor-pointer hover:bg-white transition-colors"
          onClick={() => console.log('Data still loading...')}
          title="Click to see loading status"
        >
          <div className="w-4 h-4 border-2 border-pink/30 border-t-pink rounded-full animate-spin" />
          <span className="text-sm text-text-dark/70">Loading data...</span>
        </div>
      )}

      {/* Context7 Best Practice: Main content landmark with id for skip link */}
      <main id="main-content" className="outline-none">
        {currentView === 'landing' ? (
          <LandingPage notices={notices} startCustomizing={startCustomizing} siteContent={siteContent} />
        ) : (
          <CustomizePage
            products={products}
            patches={patches}
            setCurrentView={setCurrentView}
            siteContent={siteContent}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}

export default App;
