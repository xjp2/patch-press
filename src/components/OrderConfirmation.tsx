// Order Confirmation Modal - Compact centered overlay
// Shows after successful payment with detailed order summary

import { useEffect, useState } from 'react';
import { CheckCircle, Package, Truck, Clock, MapPin, X } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { fixImagePath, type PlacementZone } from '../lib/utils';
import { CroppedThumbnail } from './CroppedThumbnail';

interface PatchDetail {
  name: string;
  image: string;
  price: number;
}

interface OrderItem {
  name: string;
  basePrice: number;
  patches: PatchDetail[];
  qty: number;
  productImage?: string;
  placementZone?: PlacementZone;
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
  shippingAddress?: ShippingAddress;
  onContinueShopping: () => void;
}

export function OrderConfirmation({
  orderNumber,
  customerEmail,
  items,
  totalAmount,
  shippingAddress,
  onContinueShopping,
}: OrderConfirmationProps) {
  const { formatPrice } = useCurrency();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onContinueShopping}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Scrollable content */}
        <div className="overflow-y-auto">
          {/* Header */}
          <div className="bg-craft-mint p-6 text-center relative">
            {/* Close button */}
            <button
              onClick={onContinueShopping}
              className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <CheckCircle className="w-7 h-7 text-craft-mint" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              Thank you!
            </h2>
            <p className="text-white/90 text-sm">
              Order #{orderNumber}
            </p>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {/* Order info */}
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                We've received your order and will ship in 5-7 business days.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Confirmation sent to {customerEmail}
              </p>
            </div>

            {/* Timeline */}
            <div className="flex items-center justify-between px-2">
              {[
                { icon: CheckCircle, label: 'Ordered', done: true },
                { icon: Package, label: 'Processing', done: false },
                { icon: Truck, label: 'Shipped', done: false },
                { icon: MapPin, label: 'Delivered', done: false },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                        step.done
                          ? 'bg-craft-mint text-white'
                          : 'bg-gray-100 text-gray-300'
                      }`}
                    >
                      <step.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-medium text-gray-500">
                      {step.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div
                      className={`w-6 h-0.5 mb-4 mx-1 ${
                        step.done ? 'bg-craft-mint/40' : 'bg-gray-100'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-craft-mint" />
                Order Summary
              </h3>

              <div className="space-y-3">
                {items.map((item, index) => {
                  const itemTotal =
                    item.basePrice +
                    item.patches.reduce((s, p) => s + p.price, 0);
                  return (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-xl p-3"
                    >
                      {/* Product row */}
                      <div className="flex gap-3">
                        <div className="w-14 h-14 bg-white rounded-lg flex-shrink-0 overflow-hidden border border-gray-100">
                          {item.productImage ? (
                            <CroppedThumbnail
                              src={fixImagePath(item.productImage)}
                              zone={item.placementZone}
                              className="w-full h-full"
                              imgClassName="object-contain"
                              alt={item.name}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {item.qty}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 text-sm">
                            {formatPrice(itemTotal * item.qty)}
                          </p>
                        </div>
                      </div>

                      {/* Price breakdown */}
                      <div className="mt-2 pt-2 border-t border-gray-200/60 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Base price</span>
                          <span className="text-gray-700">
                            {formatPrice(item.basePrice)}
                          </span>
                        </div>
                        {item.patches.map((patch) => (
                          <div
                            key={patch.name + patch.price}
                            className="flex justify-between text-xs items-center"
                          >
                            <div className="flex items-center gap-1.5">
                              <img
                                src={fixImagePath(patch.image)}
                                alt={patch.name}
                                className="w-4 h-4 object-contain"
                              />
                              <span className="text-gray-500">
                                {patch.name}
                              </span>
                            </div>
                            <span className="text-gray-700">
                              {formatPrice(patch.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipping Address */}
            {shippingAddress && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 text-xs mb-0.5">
                    Shipping to
                  </p>
                  <p className="text-xs text-gray-600">
                    {shippingAddress.name}
                    <br />
                    {shippingAddress.address_line1}
                    {shippingAddress.address_line2 && (
                      <>, {shippingAddress.address_line2}</>
                    )}
                    <br />
                    {shippingAddress.city}, {shippingAddress.postal_code}
                    <br />
                    {shippingAddress.country}
                  </p>
                </div>
              </div>
            )}

            {/* Delivery estimate */}
            <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-900">
                  Estimated Delivery
                </p>
                <p className="text-xs text-blue-700">5-7 business days</p>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-3 border-t-2 border-dashed border-gray-200">
              <div>
                <p className="font-bold text-gray-900">Total</p>
                <p className="text-[10px] text-gray-400">
                  Including all taxes & shipping
                </p>
              </div>
              <span className="text-xl font-bold text-craft-mint">
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer button */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={onContinueShopping}
            className="w-full bg-craft-mint text-white py-3 px-6 rounded-xl font-semibold hover:bg-craft-mint/90 transition-all duration-300 shadow-lg shadow-craft-mint/25"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmation;
