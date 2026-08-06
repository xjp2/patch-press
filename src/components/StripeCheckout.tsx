// Modern Stripe Checkout with PaymentElement and AddressElement
// PaymentIntent created on mount, shows payment form directly

import { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  PaymentElement,
  AddressElement,
  useStripe, 
  useElements
} from '@stripe/react-stripe-js';
import { Loader2, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import supabase from '../lib/supabase';
import { useCurrency } from '../context/CurrencyContext';
import { useAnalytics } from '../hooks/useAnalytics';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Zero-decimal currencies where Stripe uses whole units instead of cents
const isZeroDecimalCurrency = (currency: string) => ['jpy', 'krw'].includes(currency.toLowerCase());

// Track in-flight PaymentIntent requests to prevent duplicates (React Strict Mode)
const pendingRequests = new Set<string>();

interface CheckoutFormProps {
  amount: number;
  customerEmail?: string;
  orderNumber: string | null;
  paymentIntentId?: string | null;
  onSuccess: (orderData?: { orderId: string; orderNumber: string }) => void;
  onError: (error: string) => void;
}

// Checkout Form with PaymentElement and AddressElement
function CheckoutForm({ amount, customerEmail, orderNumber, paymentIntentId, onSuccess, onError }: CheckoutFormProps) {
  const { formatPrice } = useCurrency();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const hasSubmitted = useRef(false);
  
  // Log PaymentIntent ID for debugging
  useEffect(() => {
    if (paymentIntentId) {
      console.log('CheckoutForm using PaymentIntent:', paymentIntentId);
    }
  }, [paymentIntentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    
    // Prevent double submission
    if (hasSubmitted.current) {
      console.log('Payment already being processed, ignoring duplicate submit');
      return;
    }
    hasSubmitted.current = true;
    
    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Submit the form elements first (required for AddressElement)
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
          payment_method_data: {
            billing_details: {
              email: customerEmail || 'guest@example.com',
            },
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        // Payment failed
        let errorMessage = error.message || 'Payment failed. Please try again.';
        
        if (error.type === 'card_error') {
          if (error.code === 'card_declined') {
            errorMessage = 'Your card was declined. Please try a different payment method.';
          } else if (error.code === 'insufficient_funds') {
            errorMessage = 'Insufficient funds. Please try a different payment method.';
          } else if (error.code === 'expired_card') {
            errorMessage = 'Your card has expired. Please try a different payment method.';
          } else if (error.code === 'incorrect_cvc') {
            errorMessage = 'Your card\'s security code is incorrect. Please check and try again.';
          }
        }
        
        setPaymentError(errorMessage);
        onError(errorMessage);
      } else if (paymentIntent) {
        // Payment succeeded or requires additional action
        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
          // The order is created asynchronously by the Stripe webhook. We only show the
          // order number that was generated when the PaymentIntent was created.
          onSuccess({ orderId: '', orderNumber: orderNumber || '' });
        } else {
          const errorMsg = 'Payment could not be completed. Please try again.';
          setPaymentError(errorMsg);
          onError(errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred. Please try again.';
      setPaymentError(errorMsg);
      onError(errorMsg);
      // Reset submission lock on error so user can retry
      hasSubmitted.current = false;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Error Display */}
      {paymentError && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Payment Failed</p>
            <p className="text-red-700 text-sm">{paymentError}</p>
          </div>
        </div>
      )}

      {/* Shipping Address Collection */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          Shipping Address
        </h3>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <AddressElement 
            options={{
              mode: 'shipping',
              allowedCountries: ['SG', 'MY', 'ID', 'TH', 'PH', 'VN', 'US', 'GB', 'AU', 'JP', 'KR', 'CN', 'TW', 'HK'],
              fields: {
                phone: 'always',
              },
              validation: {
                phone: {
                  required: 'always',
                },
              },
            }}
            onReady={() => setIsReady(true)}
          />
        </div>
      </div>

      {/* Payment Method Collection */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">Payment Method</h3>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <PaymentElement 
            options={{
              layout: {
                type: 'tabs',
                defaultCollapsed: false,
              },
            }}
            onReady={() => setIsReady(true)}
          />
        </div>
        <p className="text-xs text-gray-500">
          Supports: Credit/Debit Cards, PayNow (Singapore), and other local payment methods
        </p>
      </div>

      {/* Test Cards Info - Only show in development */}
      {import.meta.env.DEV && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2 text-sm">Test Cards</h4>
          <div className="grid grid-cols-1 gap-1 text-xs text-blue-700 font-mono">
            <div className="flex justify-between">
              <span>Success:</span>
              <span>4242 4242 4242 4242</span>
            </div>
            <div className="flex justify-between">
              <span>Declined:</span>
              <span>4000 0000 0000 9995</span>
            </div>
            <div className="flex justify-between">
              <span>3D Secure:</span>
              <span>4000 0025 0000 3155</span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Use any future expiry and any 3-digit CVC
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing || !isReady}
        className="w-full bg-pink text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink/90 transition-colors shadow-lg shadow-pink/25"
      >
        {isProcessing ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Pay {formatPrice(amount)}
          </>
        )}
      </button>
      <p className="text-[10px] text-gray-400 text-center mt-2">Converted using current exchange rates</p>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <span>Secured by Stripe. PCI Compliant.</span>
      </div>
    </form>
  );
}

// Generate idempotency key from ALL parameters that affect the PaymentIntent.
// Stripe rejects if the same key is ever used with different parameters,
// so we must hash EVERYTHING: cart, currency, user_id, email.
function generateIdempotencyKey(
  cartItems: any[],
  currency: string,
  userId: string = '',
  customerEmail: string = ''
): string {
  const cartHash = cartItems
    .map(item => `${item.productId}-${item.quantity}-${item.totalPrice}`)
    .sort()
    .join('|');
  const raw = `${currency}|${userId || 'guest'}|${customerEmail || ''}|${cartHash}`;
  return `pp-${hashString(raw)}`;
}

// Simple hash function for strings
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getStorageKey(userId: string, cartItems: any[]): string {
  const cartHash = hashString(cartItems.map(i => i.productId).sort().join(','));
  return `stripe_pi_${userId}_${cartHash}`;
}

// Main Checkout Component
interface StripeCheckoutProps {
  amount: number;
  userId?: string;
  customerEmail?: string;
  cartItems?: any[];
  onSuccess: (orderData?: { orderId: string; orderNumber: string }) => void;
  onError: (error: string) => void;
}

export function StripeCheckout({ 
  amount, 
  userId: _userId,
  customerEmail,
  cartItems = [],
  onSuccess, 
  onError 
}: StripeCheckoutProps) {
  const { currency, convertPrice } = useCurrency();
  const { trackBeginCheckout, trackPurchase } = useAnalytics();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentTotal, setPaymentTotal] = useState<number | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const beginCheckoutSent = useRef(false);

  // Satisfy noUnusedLocals while keeping the pending order id available for debugging
  useEffect(() => {
    if (pendingOrderId) {
      console.log('Pending order id:', pendingOrderId);
    }
  }, [pendingOrderId]);

  // Create PaymentIntent with duplicate prevention
  useEffect(() => {
    let isCancelled = false;
    let requestKey = '';
    
    const createPaymentIntent = async () => {
      try {
        // Refresh session to ensure we have a valid JWT and get the REAL user ID
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Failed to refresh session:', refreshError);
          throw new Error('SESSION_REFRESH_FAILED');
        }
        
        const session = refreshData.session;
        console.log('StripeCheckout session:', { hasSession: !!session, userId: session?.user?.id });
        if (!session) throw new Error('AUTH_REQUIRED');
        
        // Use the ACTUAL user ID from session (not the prop which might be stale/undefined)
        const actualUserId = session.user.id;
        
        // Check sessionStorage for existing PaymentIntent (prevents duplicates on remount)
        const storageKey = getStorageKey(actualUserId, cartItems);
        const expectedStripeAmount = isZeroDecimalCurrency(currency)
          ? Math.round(convertPrice(amount))
          : Math.round(convertPrice(amount) * 100);
        const existingPI = sessionStorage.getItem(storageKey);
        
        if (existingPI) {
          try {
            const parsed = JSON.parse(existingPI);
            // Check if it's less than 30 minutes old and same Stripe amount
            const isRecent = (Date.now() - parsed.timestamp) < 30 * 60 * 1000;
            const sameAmount = parsed.amount === expectedStripeAmount;
            
            if (isRecent && sameAmount && parsed.clientSecret) {
              console.log('Reusing PaymentIntent from sessionStorage:', parsed.paymentIntentId);
              if (!isCancelled) {
                setClientSecret(parsed.clientSecret);
                setPaymentIntentId(parsed.paymentIntentId);
                setPaymentTotal(parsed.paymentTotal ?? null);
                setPendingOrderId(parsed.pendingOrderId ?? null);
                setOrderNumber(parsed.orderNumber ?? null);
                setIsLoading(false);
              }
              return;
            }
          } catch (e) {
            // Invalid stored data, continue to create new
            sessionStorage.removeItem(storageKey);
          }
        }
        
        // Generate idempotency key that changes if ANY parameter changes
        const idempotencyKey = generateIdempotencyKey(
          cartItems,
          currency,
          actualUserId,
          session.user.email || ''
        );
        
        // Prevent concurrent requests for same user+cart (React Strict Mode double-mount)
        const cartHash = hashString(cartItems.map(i => i.productId).sort().join(','));
        requestKey = `${actualUserId}:${cartHash}`;
        if (pendingRequests.has(requestKey)) {
          console.log('PaymentIntent request already in flight, waiting...');
          // Wait for existing request to complete (poll sessionStorage)
          let attempts = 0;
          while (pendingRequests.has(requestKey) && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
            // Check if result was stored
            const stored = sessionStorage.getItem(storageKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (!isCancelled) {
                setClientSecret(parsed.clientSecret);
                setPaymentIntentId(parsed.paymentIntentId);
                setPaymentTotal(parsed.paymentTotal ?? null);
                setPendingOrderId(parsed.pendingOrderId ?? null);
                setOrderNumber(parsed.orderNumber ?? null);
                setIsLoading(false);
              }
              return;
            }
          }
          // If we got here, the other request failed or timed out
          console.log('Previous request seems to have failed, continuing...');
        }
        
        // Mark request as in-flight
        pendingRequests.add(requestKey);
        console.log('Starting PaymentIntent creation, requestKey:', requestKey);
        
        // Call edge function directly with fetch to ensure Authorization header is set
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              cartItems: cartItems.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity || 1,
                basePrice: item.basePrice,
                totalPrice: item.totalPrice,
                productImage: item.productImage,
                productBackImage: item.productBackImage,
                placementZone: item.placementZone,
                width: item.width,
                height: item.height,
                frontPatches: item.frontPatches || [],
                backPatches: item.backPatches || [],
              })),
              currency,
              customer_email: session.user.email,
              idempotency_key: idempotencyKey,
            }),
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Edge function error:', response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        console.log('Payment intent created:', data);
        
        if (!data?.clientSecret) {
          console.error('No client secret in response:', data);
          throw new Error('Failed to initialize payment: No client secret returned');
        }
        
        // Store in sessionStorage to prevent duplicates on remount
        if (!data.reused) {
          sessionStorage.setItem(storageKey, JSON.stringify({
            clientSecret: data.clientSecret,
            paymentIntentId: data.paymentIntentId,
            pendingOrderId: data.pendingOrderId,
            orderNumber: data.orderNumber,
            amount: data.stripeAmount,
            paymentTotal: data.amount,
            timestamp: Date.now(),
          }));
        }
        
        if (!isCancelled) {
          setClientSecret(data.clientSecret);
          setPaymentIntentId(data.paymentIntentId);
          setPaymentTotal(data.amount ?? null);
          setPendingOrderId(data.pendingOrderId ?? null);
          setOrderNumber(data.orderNumber ?? null);
        }
      } catch (err: any) {
        console.error('Payment intent error:', err);
        if (!isCancelled) {
          const errorMsg = err.message || 'Failed to initialize payment';
          setError(errorMsg);
          onError(errorMsg);
        }
      } finally {
        // Remove from pending requests
        if (requestKey) {
          pendingRequests.delete(requestKey);
          console.log('Removed requestKey from pending:', requestKey);
        }
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    createPaymentIntent();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isCancelled = true;
      if (requestKey) {
        pendingRequests.delete(requestKey);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track begin_checkout once when the checkout form is ready to display
  useEffect(() => {
    if (!clientSecret || beginCheckoutSent.current) return;
    beginCheckoutSent.current = true;

    const analyticsItems = cartItems.map((item) => ({
      id: item.productId,
      name: item.productName,
      price: item.totalPrice,
      quantity: item.quantity || 1,
      currency,
    }));
    trackBeginCheckout(analyticsItems, paymentTotal ?? amount, currency);
  }, [clientSecret, cartItems, amount, paymentTotal, currency, trackBeginCheckout]);
  
  // Clear sessionStorage on successful payment and track purchase
  const handleSuccess = async (orderData?: { orderId: string; orderNumber: string }) => {
    // Get actual user ID from session (not prop)
    const { data: sessionData } = await supabase.auth.getSession();
    const actualUserId = sessionData.session?.user?.id;
    
    if (actualUserId && cartItems.length > 0) {
      const storageKey = getStorageKey(actualUserId, cartItems);
      sessionStorage.removeItem(storageKey);
    }

    // Track purchase for analytics
    if (orderData?.orderNumber) {
      const analyticsItems = cartItems.map((item) => ({
        id: item.productId,
        name: item.productName,
        price: item.totalPrice,
        quantity: item.quantity || 1,
        currency,
      }));
      trackPurchase(orderData.orderNumber, analyticsItems, paymentTotal ?? amount, currency);
    }

    onSuccess(orderData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pink" />
        <span className="ml-2 text-gray-600">Initializing payment...</span>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800">Error</p>
          <p className="text-red-700 text-sm">{error || 'Failed to initialize payment'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm text-pink hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show Payment Form directly
  return (
    <Elements 
      stripe={stripePromise}
      options={{ 
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#ec4899',
            borderRadius: '8px',
          },
        },
        loader: 'auto',
      }}
    >
      <CheckoutForm
        amount={paymentTotal ?? amount}
        customerEmail={customerEmail}
        orderNumber={orderNumber}
        paymentIntentId={paymentIntentId}
        onSuccess={handleSuccess}
        onError={onError}
      />
    </Elements>
  );
}

export default StripeCheckout;
