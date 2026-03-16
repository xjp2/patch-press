// Order Confirmation Page - Full Screen with Animations
// Shows after successful payment with order summary

import { useEffect, useState } from 'react';
import { CheckCircle, Package, Truck, Clock, MapPin } from 'lucide-react';

interface OrderItem {
  name: string;
  patches?: string[];
  qty: number;
  price: number;
  productImage?: string;
}

interface ShippingAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

interface OrderConfirmationProps {
  orderNumber: string;
  orderDate: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  shippingAddress?: ShippingAddress;
  onContinueShopping: () => void;
}

// Animated Checkmark Component
function AnimatedCheckmark() {
  return (
    <div className="relative">
      {/* Outer ring animation */}
      <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
      
      {/* Main circle */}
      <div className="relative w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
        <CheckCircle className="w-10 h-10 text-white animate-in fade-in duration-700 delay-200" />
      </div>
      
      {/* Success particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-green-400 rounded-full animate-in fade-in zoom-in duration-300"
          style={{
            top: '50%',
            left: '50%',
            transform: `rotate(${i * 60}deg) translateX(50px)`,
            animationDelay: `${300 + i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

// Timeline Step Component
function TimelineStep({ 
  icon: Icon, 
  label, 
  isActive, 
  isCompleted,
  delay 
}: { 
  icon: any; 
  label: string; 
  isActive: boolean;
  isCompleted: boolean;
  delay: number;
}) {
  return (
    <div 
      className={`flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-500 ${
        isCompleted ? 'bg-green-500 text-white' : 
        isActive ? 'bg-pink text-white scale-110' : 'bg-gray-200 text-gray-400'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={`text-xs font-medium transition-colors duration-300 ${
        isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'
      }`}>
        {label}
      </span>
    </div>
  );
}

export function OrderConfirmation({
  orderNumber,
  customerEmail,
  items,
  totalAmount,
  currency,
  shippingAddress,
  onContinueShopping,
}: OrderConfirmationProps) {
  const [mounted, setMounted] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger mount animation
    setMounted(true);
    // Stagger content appearance
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-gray-50 transition-all duration-700 ease-out ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="min-h-screen py-8 px-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          
          {/* Success Header */}
          <div 
            className={`text-center mb-8 transition-all duration-700 ease-out ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="flex justify-center mb-6">
              <AnimatedCheckmark />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Thank you for your purchase!
            </h1>
            <p className="text-gray-600 text-lg mb-2">
              We've received your order and will ship in 5-7 business days.
            </p>
            <p className="text-gray-900 font-semibold text-lg">
              Order #{orderNumber}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Confirmation sent to {customerEmail}
            </p>
          </div>

          {/* Order Timeline */}
          <div 
            className={`bg-white rounded-2xl shadow-sm p-6 mb-6 transition-all duration-700 ease-out ${
              showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <div className="flex justify-between items-center">
              <TimelineStep 
                icon={CheckCircle} 
                label="Ordered" 
                isActive={true} 
                isCompleted={true}
                delay={400}
              />
              <div className="flex-1 h-0.5 bg-green-200 mx-2" />
              <TimelineStep 
                icon={Package} 
                label="Processing" 
                isActive={false} 
                isCompleted={false}
                delay={500}
              />
              <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
              <TimelineStep 
                icon={Truck} 
                label="Shipped" 
                isActive={false} 
                isCompleted={false}
                delay={600}
              />
              <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
              <TimelineStep 
                icon={MapPin} 
                label="Delivered" 
                isActive={false} 
                isCompleted={false}
                delay={700}
              />
            </div>
          </div>

          {/* Order Summary Card */}
          <div 
            className={`bg-white rounded-2xl shadow-lg p-6 mb-6 transition-all duration-700 ease-out ${
              showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            <h2 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-pink" />
              Order Summary
            </h2>
            
            {/* Items */}
            <div className="space-y-4">
              {items.map((item, index) => (
                <div 
                  key={index} 
                  className="flex gap-4 animate-in slide-in-from-left-4 duration-500"
                  style={{ animationDelay: `${300 + index * 100}ms`, animationFillMode: 'both' }}
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.productImage ? (
                      <img 
                        src={item.productImage} 
                        alt={item.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <Package className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="font-semibold text-gray-900 text-lg">{item.name}</p>
                    {item.patches && item.patches.length > 0 && (
                      <p className="text-sm text-gray-500">
                        Patches: {item.patches.join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">Quantity: {item.qty}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="font-bold text-gray-900 text-lg">
                      ${(item.price * item.qty).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t-2 border-dashed border-gray-200 my-6" />

            {/* Total */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600">Total</p>
                <p className="text-sm text-gray-400">Including all taxes & shipping</p>
              </div>
              <span className="font-bold text-2xl text-gray-900">
                {currency === 'sgd' ? 'S$' : '$'}{totalAmount.toFixed(2)}
              </span>
            </div>

            {/* Shipping Address */}
            {shippingAddress && (
              <>
                <div className="border-t border-gray-200 my-6" />
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Shipping Address</p>
                    <p className="text-gray-600">
                      {shippingAddress.name}<br />
                      {shippingAddress.address_line1}
                      {shippingAddress.address_line2 && <>, {shippingAddress.address_line2}</>}<br />
                      {shippingAddress.city}, {shippingAddress.postal_code}<br />
                      {shippingAddress.country}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Estimated Delivery */}
          <div 
            className={`bg-blue-50 rounded-2xl p-4 mb-6 flex items-center gap-4 transition-all duration-700 ease-out ${
              showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">Estimated Delivery</p>
              <p className="text-blue-700">5-7 business days</p>
            </div>
          </div>

          {/* Back to Home Button */}
          <div 
            className={`transition-all duration-700 ease-out ${
              showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            style={{ transitionDelay: '500ms' }}
          >
            <button
              onClick={onContinueShopping}
              className="w-full bg-pink text-white py-4 px-6 rounded-xl font-semibold hover:bg-pink/90 transition-all duration-300 shadow-lg shadow-pink/25 hover:shadow-xl hover:shadow-pink/30 hover:-translate-y-0.5"
            >
              Continue Shopping
            </button>
          </div>

          {/* Trust Badges */}
          <div 
            className={`flex items-center justify-center gap-6 mt-8 text-sm text-gray-500 transition-all duration-700 ease-out ${
              showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span>Free Shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Fast Processing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmation;
