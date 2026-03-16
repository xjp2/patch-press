import { useState, useEffect } from 'react';
import { 
  RefreshCw, Package, Truck, CheckCircle, Clock, X, ChevronDown, ChevronUp,
  Search, MapPin, CreditCard, CheckSquare, Square, Play
} from 'lucide-react';
import supabase from '../lib/supabase';
import { CraftingView } from './CraftingView';
import { ProductionMode } from './ProductionMode';

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
  shipping_country: string | null;
  currency: string;
  user_id?: string;
}

export function AdminOrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({});
  
  // Crafting view state
  const [craftingView, setCraftingView] = useState<{
    show: boolean;
    productName: string;
    productImage: string;
    productBackImage?: string;
    patches: PlacedPatchData[];
    side: 'front' | 'back';
  } | null>(null);

  // Production mode state
  const [productionMode, setProductionMode] = useState<{
    show: boolean;
    currentIndex: number;
    orders: Order[];
  } | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, trackingNum?: string) => {
    setUpdating(orderId);
    try {
      const updates: any = { fulfillment_status: status };
      
      if (status === 'shipped') {
        updates.tracking_number = trackingNum || null;
        updates.shipped_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      } else if (status === 'processing') {
        updates.processing_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;
      await loadOrders();
    } catch (err) {
      console.error('Failed to update order:', err);
      alert('Failed to update order status');
    } finally {
      setUpdating(null);
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedOrders.size === 0) return;
    
    const confirmed = confirm(`Mark ${selectedOrders.size} orders as ${status}?`);
    if (!confirmed) return;

    setUpdating('bulk');
    try {
      const updates: any = { fulfillment_status: status };
      
      if (status === 'shipped') {
        updates.shipped_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      } else if (status === 'processing') {
        updates.processing_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .in('id', Array.from(selectedOrders));

      if (error) throw error;
      await loadOrders();
      setSelectedOrders(new Set());
    } catch (err) {
      console.error('Bulk update failed:', err);
      alert('Failed to update orders');
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpand = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const toggleSelect = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const selectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.fulfillment_status === filter;
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items?.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
      pending: { 
        icon: <Clock className="w-4 h-4" />, 
        color: 'text-yellow-700', 
        bg: 'bg-yellow-100',
        label: 'Pending'
      },
      processing: { 
        icon: <Package className="w-4 h-4" />, 
        color: 'text-blue-700', 
        bg: 'bg-blue-100',
        label: 'Processing'
      },
      shipped: { 
        icon: <Truck className="w-4 h-4" />, 
        color: 'text-purple-700', 
        bg: 'bg-purple-100',
        label: 'Shipped'
      },
      delivered: { 
        icon: <CheckCircle className="w-4 h-4" />, 
        color: 'text-green-700', 
        bg: 'bg-green-100',
        label: 'Delivered'
      },
      cancelled: { 
        icon: <X className="w-4 h-4" />, 
        color: 'text-red-700', 
        bg: 'bg-red-100',
        label: 'Cancelled'
      },
    };
    return configs[status] || configs.pending;
  };

  const formatCurrency = (amount: number, currency: string) => {
    // Amount is stored in cents, convert to dollars
    const dollars = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD',
    }).format(dollars);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-pink" />
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['all', 'pending', 'processing', 'shipped', 'delivered'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`p-3 rounded-xl text-left transition-all ${
              filter === status 
                ? 'bg-pink text-white shadow-md' 
                : 'bg-white border hover:shadow-sm'
            }`}
          >
            <p className="text-xs opacity-80 uppercase tracking-wide">
              {status === 'all' ? 'Total' : status}
            </p>
            <p className="text-2xl font-bold">
              {status === 'all' 
                ? orders.length 
                : orders.filter(o => o.fulfillment_status === status).length}
            </p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders, customers, products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-pink/20 focus:border-pink"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={loadOrders}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            {/* Production Mode Button - Only show for pending/processing orders */}
            {filteredOrders.filter(o => o.fulfillment_status === 'pending' || o.fulfillment_status === 'processing').length > 0 && (
              <button
                onClick={() => {
                  const ordersToProcess = filteredOrders.filter(
                    o => o.fulfillment_status === 'pending' || o.fulfillment_status === 'processing'
                  );
                  setProductionMode({
                    show: true,
                    currentIndex: 0,
                    orders: ordersToProcess
                  });
                }}
                className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Production Mode ({filteredOrders.filter(o => o.fulfillment_status === 'pending' || o.fulfillment_status === 'processing').length})
              </button>
            )}
            
            {selectedOrders.size > 0 && (
              <>
                <span className="px-3 py-2 bg-pink/10 text-pink rounded-lg text-sm font-medium">
                  {selectedOrders.size} selected
                </span>
                <button
                  onClick={() => bulkUpdateStatus('processing')}
                  disabled={updating === 'bulk'}
                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm font-medium"
                >
                  Mark Processing
                </button>
                <button
                  onClick={() => bulkUpdateStatus('shipped')}
                  disabled={updating === 'bulk'}
                  className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-sm font-medium"
                >
                  Mark Shipped
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bulk Select */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {selectedOrders.size === filteredOrders.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Select All ({filteredOrders.length})
            </button>
          </div>
        )}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.fulfillment_status);
            const isExpanded = expandedOrders.has(order.id);
            const isSelected = selectedOrders.has(order.id);
            const hasDesignImages = order.items?.some(item => 
              item.design_image_url || item.front_image || item.back_image
            );

            return (
              <div
                key={order.id}
                className={`bg-white rounded-xl border overflow-hidden transition-all ${
                  isSelected ? 'border-pink ring-1 ring-pink' : 'hover:shadow-md'
                }`}
              >
                {/* Order Header - Always Visible */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(order.id)}
                      className="mt-1 text-gray-400 hover:text-pink"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-bold text-lg">#{order.order_number}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                        {hasDesignImages && (
                          <span className="px-2 py-1 bg-pink/10 text-pink rounded-full text-xs">
                            Custom Design
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs">Customer</p>
                          <p className="font-medium truncate">{order.customer_name || order.customer_email}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Date</p>
                          <p>{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Items</p>
                          <p>{order.items?.length || 0} products</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Total</p>
                          <p className="font-bold">{formatCurrency(order.total_amount, order.currency)}</p>
                        </div>
                      </div>

                      {/* Quick Item Preview */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.items?.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {item.name} × {item.qty}
                          </span>
                        ))}
                        {order.items && order.items.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{order.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>

                      {/* Quick Status Actions */}
                      <div className="flex gap-1">
                        {order.fulfillment_status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'processing')}
                            disabled={updating === order.id}
                            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-xs font-medium"
                          >
                            Process
                          </button>
                        )}
                        {order.fulfillment_status === 'processing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'shipped', trackingInput[order.id])}
                            disabled={updating === order.id}
                            className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-xs font-medium"
                          >
                            Ship
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tracking Input for Processing Orders */}
                  {order.fulfillment_status === 'processing' && (
                    <div className="mt-3 ml-8">
                      <input
                        type="text"
                        placeholder="Tracking number (optional)"
                        value={trackingInput[order.id] || ''}
                        onChange={(e) => setTrackingInput({ ...trackingInput, [order.id]: e.target.value })}
                        className="px-3 py-2 border rounded-lg text-sm w-full max-w-xs"
                      />
                    </div>
                  )}

                  {/* Tracking Display */}
                  {order.tracking_number && (
                    <div className="mt-3 ml-8 text-sm">
                      <span className="text-purple-700">
                        📦 Tracking: <span className="font-mono">{order.tracking_number}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Customer & Shipping */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Customer Info
                          </h4>
                          <div className="bg-white rounded-lg p-3 text-sm">
                            <p className="font-medium">{order.customer_name || 'N/A'}</p>
                            <p className="text-gray-600">{order.customer_email}</p>
                          </div>
                        </div>

                        {order.shipping_address && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              Shipping Address
                            </h4>
                            <div className="bg-white rounded-lg p-3 text-sm">
                              <p className="font-medium">{order.shipping_address.name}</p>
                              <p>{order.shipping_address.address_line1}</p>
                              {order.shipping_address.address_line2 && (
                                <p>{order.shipping_address.address_line2}</p>
                              )}
                              <p>
                                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                              </p>
                              <p>{order.shipping_address.country}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Order Items with Designs */}
                      <div>
                        <h4 className="font-semibold mb-2">Order Items & Designs</h4>
                        <div className="space-y-3">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-gray-500">Qty: {item.qty} × {formatCurrency(item.price, order.currency)}</p>
                                </div>
                                <p className="font-bold">{formatCurrency(item.price * item.qty, order.currency)}</p>
                              </div>

                              {/* Design Images with Patch Overlays */}
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                {/* Front Side */}
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Front</p>
                                  <div 
                                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative cursor-pointer"
                                    onClick={() => item.frontPatches && item.frontPatches.length > 0 && setCraftingView({
                                      show: true,
                                      productName: item.name,
                                      productImage: item.productImage || '/placeholder-product.png',
                                      productBackImage: item.productBackImage,
                                      patches: item.frontPatches || [],
                                      side: 'front'
                                    })}
                                  >
                                    <img 
                                      src={item.productImage || '/placeholder-product.png'}
                                      alt="Front design"
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                      }}
                                    />
                                    {/* Patch Overlays - Same positioning as CustomizePage */}
                                    {item.frontPatches?.map((patch, pidx) => {
                                      const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                                      const cx = cz.x + cz.width / 2;
                                      const cy = cz.y + cz.height / 2;
                                      return (
                                        <div
                                          key={patch.id}
                                          className="absolute"
                                          style={{
                                            left: `${patch.x}%`,
                                            top: `${patch.y}%`,
                                            width: `${patch.widthPercent}%`,
                                            height: `${patch.heightPercent}%`,
                                            transform: `rotate(${patch.rotation}deg)`,
                                            transformOrigin: `${cx}% ${cy}%`,
                                          }}
                                        >
                                          <img
                                            src={patch.image}
                                            alt={patch.name}
                                            className="w-full h-full object-contain drop-shadow-md"
                                            style={{
                                              clipPath: patch.contentZone
                                                ? (patch.contentZone.type === 'polygon' && patch.contentZone.points
                                                  ? `polygon(${patch.contentZone.points.map((p: {x: number, y: number}) => `${p.x}% ${p.y}%`).join(', ')})`
                                                  : `inset(${patch.contentZone.y}% ${100 - (patch.contentZone.x + patch.contentZone.width)}% ${100 - (patch.contentZone.y + patch.contentZone.height)}% ${patch.contentZone.x}%)`)
                                                : 'none'
                                            }}
                                          />
                                          <div 
                                            className="absolute w-5 h-5 bg-pink text-white rounded-full flex items-center justify-center text-xs font-bold shadow"
                                            style={{
                                              left: `${cx}%`,
                                              top: `${cy}%`,
                                              transform: 'translate(-50%, -50%)'
                                            }}
                                          >
                                            {pidx + 1}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {/* Front Patches List */}
                                  {item.frontPatches && item.frontPatches.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {item.frontPatches.map((patch, pidx) => (
                                        <span key={patch.id} className="text-xs bg-pink/10 text-pink px-2 py-0.5 rounded flex items-center gap-1">
                                          <span className="w-4 h-4 bg-pink text-white rounded-full flex items-center justify-center text-[10px]">{pidx + 1}</span>
                                          {patch.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Back Side */}
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Back</p>
                                  <div 
                                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative cursor-pointer"
                                    onClick={() => item.backPatches && item.backPatches.length > 0 && setCraftingView({
                                      show: true,
                                      productName: item.name,
                                      productImage: item.productImage || '/placeholder-product.png',
                                      productBackImage: item.productBackImage,
                                      patches: item.backPatches || [],
                                      side: 'back'
                                    })}
                                  >
                                    <img 
                                      src={item.productBackImage || item.productImage || '/placeholder-product.png'}
                                      alt="Back design"
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                      }}
                                    />
                                    {/* Patch Overlays - Same positioning as CustomizePage */}
                                    {item.backPatches?.map((patch, pidx) => {
                                      const cz = patch.contentZone || { x: 0, y: 0, width: 100, height: 100 };
                                      const cx = cz.x + cz.width / 2;
                                      const cy = cz.y + cz.height / 2;
                                      return (
                                        <div
                                          key={patch.id}
                                          className="absolute"
                                          style={{
                                            left: `${patch.x}%`,
                                            top: `${patch.y}%`,
                                            width: `${patch.widthPercent}%`,
                                            height: `${patch.heightPercent}%`,
                                            transform: `rotate(${patch.rotation}deg)`,
                                            transformOrigin: `${cx}% ${cy}%`,
                                          }}
                                        >
                                          <img
                                            src={patch.image}
                                            alt={patch.name}
                                            className="w-full h-full object-contain drop-shadow-md"
                                            style={{
                                              clipPath: patch.contentZone
                                                ? (patch.contentZone.type === 'polygon' && patch.contentZone.points
                                                  ? `polygon(${patch.contentZone.points.map((p: {x: number, y: number}) => `${p.x}% ${p.y}%`).join(', ')})`
                                                  : `inset(${patch.contentZone.y}% ${100 - (patch.contentZone.x + patch.contentZone.width)}% ${100 - (patch.contentZone.y + patch.contentZone.height)}% ${patch.contentZone.x}%)`)
                                                : 'none'
                                            }}
                                          />
                                          <div 
                                            className="absolute w-5 h-5 bg-pink text-white rounded-full flex items-center justify-center text-xs font-bold shadow"
                                            style={{
                                              left: `${cx}%`,
                                              top: `${cy}%`,
                                              transform: 'translate(-50%, -50%)'
                                            }}
                                          >
                                            {pidx + 1}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {/* Back Patches List */}
                                  {item.backPatches && item.backPatches.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {item.backPatches.map((patch, pidx) => (
                                        <span key={patch.id} className="text-xs bg-pink/10 text-pink px-2 py-0.5 rounded flex items-center gap-1">
                                          <span className="w-4 h-4 bg-pink text-white rounded-full flex items-center justify-center text-[10px]">{pidx + 1}</span>
                                          {patch.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Patches */}
                              {item.patches && item.patches.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-400 mb-1">Patches:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {item.patches.map((patch, pidx) => (
                                      <span key={pidx} className="text-xs bg-pink/10 text-pink px-2 py-0.5 rounded">
                                        {patch}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center pt-3 border-t mt-3">
                          <span className="font-bold">Total</span>
                          <span className="font-bold text-lg">{formatCurrency(order.total_amount, order.currency)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Full Timeline */}
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-3">Order Timeline</h4>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Ordered: {new Date(order.created_at).toLocaleString()}</span>
                        </div>
                        {order.shipped_at && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            <span>Shipped: {new Date(order.shipped_at).toLocaleString()}</span>
                          </div>
                        )}
                        {order.delivered_at && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span>Delivered: {new Date(order.delivered_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Crafting View Modal */}
      {craftingView?.show && (
        <CraftingView
          productName={craftingView.productName}
          productImage={craftingView.productImage}
          productBackImage={craftingView.productBackImage}
          patches={craftingView.patches}
          side={craftingView.side}
          onClose={() => setCraftingView(null)}
        />
      )}

      {/* Production Mode Modal */}
      {productionMode?.show && (
        <ProductionMode
          orders={productionMode.orders}
          currentIndex={productionMode.currentIndex}
          onClose={() => setProductionMode(null)}
          onNext={() => {
            if (productionMode.currentIndex < productionMode.orders.length - 1) {
              setProductionMode({
                ...productionMode,
                currentIndex: productionMode.currentIndex + 1
              });
            }
          }}
          onPrevious={() => {
            if (productionMode.currentIndex > 0) {
              setProductionMode({
                ...productionMode,
                currentIndex: productionMode.currentIndex - 1
              });
            }
          }}
          onMarkComplete={async (orderId) => {
            await updateOrderStatus(orderId, 'processing');
            // Move to next order
            if (productionMode.currentIndex < productionMode.orders.length - 1) {
              setProductionMode({
                ...productionMode,
                currentIndex: productionMode.currentIndex + 1
              });
            } else {
              // All done
              setProductionMode(null);
            }
          }}
          onSkip={() => {
            if (productionMode.currentIndex < productionMode.orders.length - 1) {
              setProductionMode({
                ...productionMode,
                currentIndex: productionMode.currentIndex + 1
              });
            }
          }}
        />
      )}
    </div>
  );
}

export default AdminOrderManagement;
