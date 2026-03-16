import { useState, useEffect } from 'react';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, CreditCard } from 'lucide-react';
import supabase from '../lib/supabase';

interface PlacedPatchData {
  id: string;
  name: string;
  image: string;
  price: number;
  x: number;
  y: number;
  rotation: number;
  widthPercent: number;
  heightPercent: number;
  contentZone?: {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'rectangle' | 'polygon';
    points?: { x: number; y: number }[];
  };
}

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  patches?: string[];
  productImage?: string;
  productBackImage?: string;
  design_image_url?: string;
  front_image?: string;
  back_image?: string;
  frontPatches?: PlacedPatchData[];
  backPatches?: PlacedPatchData[];
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

interface Order {
  id: string;
  order_number: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  fulfillment_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  tracking_number?: string;
  created_at: string;
  shipped_at?: string;
  delivered_at?: string;
  customer_email: string;
  customer_name: string;
  shipping_address: ShippingAddress | null;
  currency: string;
}

interface OrderDetailPageProps {
  orderId: string;
  onBack: () => void;
}

export function OrderDetailPage({ orderId, onBack }: OrderDetailPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
      pending: { 
        icon: <Clock className="w-5 h-5" />, 
        color: 'text-yellow-600', 
        bg: 'bg-yellow-50',
        label: 'Order Placed'
      },
      processing: { 
        icon: <Package className="w-5 h-5" />, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50',
        label: 'Preparing'
      },
      shipped: { 
        icon: <Truck className="w-5 h-5" />, 
        color: 'text-purple-600', 
        bg: 'bg-purple-50',
        label: 'Shipped'
      },
      delivered: { 
        icon: <CheckCircle className="w-5 h-5" />, 
        color: 'text-green-600', 
        bg: 'bg-green-50',
        label: 'Delivered'
      },
      cancelled: { 
        icon: <Clock className="w-5 h-5" />, 
        color: 'text-red-600', 
        bg: 'bg-red-50',
        label: 'Cancelled'
      },
    };
    return configs[status] || configs.pending;
  };

  const getTimelineSteps = (order: Order) => {
    const steps = [
      { 
        status: 'pending', 
        label: 'Order Placed', 
        date: order.created_at,
        description: 'Your order has been received'
      },
      { 
        status: 'processing', 
        label: 'Processing', 
        date: order.fulfillment_status !== 'pending' ? order.created_at : null,
        description: 'We\'re preparing your custom design'
      },
      { 
        status: 'shipped', 
        label: 'Shipped', 
        date: order.shipped_at,
        description: order.tracking_number ? `Tracking: ${order.tracking_number}` : 'Your order is on the way'
      },
      { 
        status: 'delivered', 
        label: 'Delivered', 
        date: order.delivered_at,
        description: 'Enjoy your custom creation!'
      },
    ];
    return steps;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Order not found'}</p>
          <button onClick={onBack} className="text-pink hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.fulfillment_status);
  const timelineSteps = getTimelineSteps(order);
  const currentStepIndex = timelineSteps.findIndex(s => s.status === order.fulfillment_status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Orders</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Order Header */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
              <p className="text-gray-500 mt-1">
                Placed on {new Date(order.created_at).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.icon}
              <span className="font-semibold">{statusConfig.label}</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Timeline & Items */}
          <div className="md:col-span-2 space-y-6">
            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-lg font-bold mb-6">Order Timeline</h2>
              <div className="relative">
                {timelineSteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const stepConfig = getStatusConfig(step.status);
                  
                  return (
                    <div key={step.status} className="flex gap-4 pb-8 last:pb-0">
                      {/* Line and Icon */}
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted ? stepConfig.bg : 'bg-gray-100'
                        } ${isCompleted ? stepConfig.color : 'text-gray-400'}`}>
                          {stepConfig.icon}
                        </div>
                        {index < timelineSteps.length - 1 && (
                          <div className={`w-0.5 flex-1 mt-2 ${
                            index < currentStepIndex ? 'bg-green-400' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-pink text-white text-xs rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                          {step.description}
                        </p>
                        {step.date && (
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(step.date).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Items with Designs */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-lg font-bold mb-6">Your Custom Designs</h2>
              <div className="space-y-6">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="border rounded-xl overflow-hidden">
                    {/* Item Header */}
                    <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-gray-500">Qty: {item.qty}</p>
                      </div>
                      <p className="font-bold">{formatCurrency(item.price * item.qty, order.currency)}</p>
                    </div>

                    {/* Design Preview */}
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Front Design */}
                        <div>
                          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Front Design</p>
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                            <img 
                              src={item.design_image_url || item.front_image || item.productImage} 
                              alt="Front design"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-product.png';
                              }}
                            />
                            {/* Overlay patches if placement data available */}
                            {item.frontPatches && item.frontPatches.length > 0 && (
                              <div className="absolute inset-0 pointer-events-none">
                                {item.frontPatches.map((patch, idx) => (
                                  <img
                                    key={idx}
                                    src={patch.image}
                                    alt={patch.name}
                                    className="absolute drop-shadow-md"
                                    style={{
                                      left: `${patch.x}%`,
                                      top: `${patch.y}%`,
                                      width: `${patch.widthPercent}%`,
                                      height: `${patch.heightPercent}%`,
                                      transform: `rotate(${patch.rotation}deg)`,
                                      transformOrigin: `${(patch.contentZone?.x || 0) + (patch.contentZone?.width || 100) / 2}% ${(patch.contentZone?.y || 0) + (patch.contentZone?.height || 100) / 2}%`,
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          {item.frontPatches && item.frontPatches.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1 text-center">
                              {item.frontPatches.length} patches placed
                            </p>
                          )}
                        </div>
                        
                        {/* Back Design */}
                        <div>
                          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Back Design</p>
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                            <img 
                              src={item.back_image || item.productBackImage || item.productImage} 
                              alt="Back design"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-product.png';
                              }}
                            />
                            {/* Overlay patches if placement data available */}
                            {item.backPatches && item.backPatches.length > 0 && (
                              <div className="absolute inset-0 pointer-events-none">
                                {item.backPatches.map((patch, idx) => (
                                  <img
                                    key={idx}
                                    src={patch.image}
                                    alt={patch.name}
                                    className="absolute drop-shadow-md"
                                    style={{
                                      left: `${patch.x}%`,
                                      top: `${patch.y}%`,
                                      width: `${patch.widthPercent}%`,
                                      height: `${patch.heightPercent}%`,
                                      transform: `rotate(${patch.rotation}deg)`,
                                      transformOrigin: `${(patch.contentZone?.x || 0) + (patch.contentZone?.width || 100) / 2}% ${(patch.contentZone?.y || 0) + (patch.contentZone?.height || 100) / 2}%`,
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          {item.backPatches && item.backPatches.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1 text-center">
                              {item.backPatches.length} patches placed
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Patches Used */}
                    {item.patches && item.patches.length > 0 && (
                      <div className="px-4 pb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Patches Used:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.patches.map((patch, pidx) => (
                            <span 
                              key={pidx}
                              className="px-3 py-1 bg-pink/10 text-pink rounded-full text-sm"
                            >
                              {patch}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Cost Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
              <div className="space-y-3">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} × {item.qty}</span>
                    <span>{formatCurrency(item.price * item.qty, order.currency)}</span>
                  </div>
                ))}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(order.total_amount, order.currency)}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-xl">{formatCurrency(order.total_amount, order.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-bold">Shipping To</h2>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-900">{order.shipping_address.name}</p>
                  <p>{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                  </p>
                  <p>{order.shipping_address.country}</p>
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-bold">Payment</h2>
              </div>
              <div className="text-sm text-gray-600">
                <p>Paid with Card</p>
                <p className="text-green-600 font-medium mt-1">Payment Successful</p>
              </div>
            </div>

            {/* Need Help */}
            <div className="bg-gray-50 rounded-2xl border p-6">
              <h2 className="text-lg font-bold mb-2">Need Help?</h2>
              <p className="text-sm text-gray-600 mb-4">
                Have questions about your order? Contact our support team.
              </p>
              <a 
                href="mailto:support@patchpress.com"
                className="text-pink hover:underline text-sm font-medium"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
