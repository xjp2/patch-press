import { useState, useEffect } from 'react';
import { 
  RefreshCw, Package, Truck, CheckCircle, Clock, X, ChevronDown, ChevronUp,
  Search, MapPin, CreditCard, CheckSquare, Square, Play, Eye, Palette
} from 'lucide-react';
import supabase from '../lib/supabase';
import { CraftingView } from './CraftingView';
import { ProductionMode } from './ProductionMode';

import { DesignPreview } from './DesignPreview';

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";



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
  basePrice?: number;
  patches?: string[];
  productImage?: string;
  productBackImage?: string;
  design_image_url?: string;
  front_image?: string;
  back_image?: string;
  frontPatches?: PlacedPatchData[];
  backPatches?: PlacedPatchData[];
  // Product details
  productWidth?: number;
  productHeight?: number;
  placementZone?: {
    type: 'rectangle' | 'polygon';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: { x: number; y: number }[];
  };
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
    productWidthCm?: number;
    productHeightCm?: number;
    placementZone?: OrderItem['placementZone'];
  } | null>(null);

  // Production mode state
  const [productionMode, setProductionMode] = useState<{
    show: boolean;
    currentIndex: number;
    orders: Order[];
  } | null>(null);

  useEffect(() => {
    loadOrders();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
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

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const toggleSelected = (orderId: string) => {
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
    // Amount is stored in dollars (not cents)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const updateFulfillmentStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      const updates: any = { fulfillment_status: status };
      
      if (status === 'shipped') {
        updates.shipped_at = new Date().toISOString();
        updates.tracking_number = trackingInput[orderId] || null;
      } else if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;
      
      // Clear tracking input after successful update
      if (status === 'shipped') {
        setTrackingInput(prev => {
          const newInput = { ...prev };
          delete newInput[orderId];
          return newInput;
        });
      }
      
      await loadOrders();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedOrders.size === 0) return;
    
    const orderIds = Array.from(selectedOrders);
    setUpdating('bulk');
    
    try {
      const updates: any = { fulfillment_status: status };
      
      if (status === 'shipped') {
        updates.shipped_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .in('id', orderIds);

      if (error) throw error;
      
      setSelectedOrders(new Set());
      await loadOrders();
    } catch (err) {
      console.error('Failed to bulk update:', err);
      alert('Failed to update orders. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // Calculate patch details for an item
  // item.price is the TOTAL per unit (base + patches) stored at order time
  const getPatchDetails = (item: OrderItem) => {
    const frontPatches = item.frontPatches || [];
    const backPatches = item.backPatches || [];
    const allPatches = [...frontPatches, ...backPatches];
    const qty = item.qty || 1;
    
    const patchTotalPerUnit = allPatches.reduce((sum, p) => sum + (p.price || 0), 0);
    const patchTotal = patchTotalPerUnit * qty;
    const unitTotal = item.price || 0;
    // For newer orders, basePrice is stored directly. For older orders, derive it.
    const basePricePerUnit = item.basePrice !== undefined ? item.basePrice : Math.max(0, unitTotal - patchTotalPerUnit);
    const productTotal = basePricePerUnit * qty;
    const total = unitTotal * qty;
    
    return {
      frontCount: frontPatches.length,
      backCount: backPatches.length,
      totalPatches: allPatches.length,
      patchTotal,
      patchTotalPerUnit,
      productTotal,
      basePricePerUnit,
      total
    };
  };

  // Open crafting view for production/design preview
  const openCraftingView = (item: OrderItem, side: 'front' | 'back') => {
    const patches = side === 'front' ? (item.frontPatches || []) : (item.backPatches || []);
    setCraftingView({
      show: true,
      productName: item.name,
      productImage: item.productImage || '/placeholder-product.png',
      productBackImage: item.productBackImage,
      patches,
      side,
      productWidthCm: item.productWidth ? item.productWidth / 10 : 40,
      productHeightCm: item.productHeight ? item.productHeight / 10 : 45,
      placementZone: item.placementZone,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-pink" />
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    );
  }

  const activeOrders = filteredOrders.filter(o => o.fulfillment_status !== 'delivered' && o.fulfillment_status !== 'cancelled');

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold">{orders.length}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 shadow-sm border border-yellow-200">
          <p className="text-sm text-yellow-700">Pending</p>
          <p className="text-2xl font-bold text-yellow-800">
            {orders.filter(o => o.fulfillment_status === 'pending').length}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-200">
          <p className="text-sm text-blue-700">Processing</p>
          <p className="text-2xl font-bold text-blue-800">
            {orders.filter(o => o.fulfillment_status === 'processing').length}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-200">
          <p className="text-sm text-green-700">Active</p>
          <p className="text-2xl font-bold text-green-800">{activeOrders.length}</p>
        </div>
      </div>

      {/* Production Mode Button */}
      {activeOrders.length > 0 && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 border border-pink-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Production Mode</h3>
              <p className="text-sm text-gray-600">
                {activeOrders.length} active orders ({activeOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0)} items) ready for production
              </p>
            </div>
            <button
              onClick={() => setProductionMode({ 
                show: true, 
                currentIndex: 0, 
                orders: activeOrders 
              })}
              className="flex items-center gap-2 px-4 py-2 bg-pink text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Production
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg p-4 shadow-sm border space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-pink focus:border-pink"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          
          <button
            onClick={selectAll}
            className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
          >
            {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-pink" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Select All
          </button>
          
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-pink focus:border-pink"
              />
            </div>
          </div>

          {selectedOrders.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{selectedOrders.size} selected</span>
              <button
                onClick={() => bulkUpdateStatus('processing')}
                disabled={updating === 'bulk'}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 disabled:opacity-50"
              >
                Mark Processing
              </button>
              <button
                onClick={() => bulkUpdateStatus('shipped')}
                disabled={updating === 'bulk'}
                className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 disabled:opacity-50"
              >
                Mark Shipped
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const statusConfig = getStatusConfig(order.fulfillment_status);
          const isExpanded = expandedOrders.has(order.id);
          const isSelected = selectedOrders.has(order.id);

          return (
            <div
              key={order.id}
              className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-all ${
                isSelected ? 'ring-2 ring-pink border-pink' : ''
              }`}
            >
              {/* Order Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpanded(order.id)}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelected(order.id);
                      }}
                      className="text-gray-400 hover:text-pink"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-pink" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <p className="font-semibold text-lg">{order.order_number}</p>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                      <span className="flex items-center gap-1">
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-semibold text-lg">{formatCurrency(order.total_amount, order.currency)}</p>
                      <p className="text-sm text-gray-500">{order.items?.length || 0} item(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package className="w-4 h-4" />
                    <span>{order.customer_name || 'No name'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <CreditCard className="w-4 h-4" />
                    <span>{order.customer_email}</span>
                  </div>
                  {order.shipping_country && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{order.shipping_country}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Order Items with Designs */}
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Order Items & Designs
                      </h4>
                      
                      {order.items?.map((item, idx) => {
                        const details = getPatchDetails(item);
                        
                        return (
                          <div key={idx} className="bg-white rounded-lg p-4 border shadow-sm">
                            {/* Item Header */}
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-medium text-lg">{item.name}</p>
                                <p className="text-sm text-gray-500">
                                  Qty: {item.qty || 1}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">
                                  {formatCurrency(details.total, order.currency)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Base: {formatCurrency(details.productTotal, order.currency)}
                                  {details.totalPatches > 0 && ` + Patches: ${formatCurrency(details.patchTotal, order.currency)}`}
                                </p>
                              </div>
                            </div>

                            {/* Price Breakdown */}
                            <div className="bg-gray-50 rounded p-2 mb-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Base Price:</span>
                                <span>{formatCurrency(details.basePricePerUnit, order.currency)} {item.qty > 1 && <span className="text-gray-400">× {item.qty}</span>}</span>
                              </div>
                              {details.totalPatches > 0 && (
                                <div className="flex justify-between mt-1">
                                  <span className="text-gray-600">
                                    Patches ({details.totalPatches}):
                                  </span>
                                  <span>{formatCurrency(details.patchTotalPerUnit, order.currency)} {item.qty > 1 && <span className="text-gray-400">× {item.qty}</span>}</span>
                                </div>
                              )}
                              <Separator className="my-1" />
                              <div className="flex justify-between font-medium">
                                <span>Item Total:</span>
                                <span>{formatCurrency(details.total, order.currency)}</span>
                              </div>
                            </div>

                            {/* Design Previews — always show both sides */}
                            <div className="grid grid-cols-2 gap-3 items-start">
                              {/* Front */}
                              <div>
                                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">Front</Badge>
                                  <span>{details.frontCount} patch(es)</span>
                                </p>
                                <div className="bg-gray-100 rounded-lg p-2">
                                  <DesignPreview
                                    productImage={item.productImage || '/placeholder-product.png'}
                                    patches={item.frontPatches || []}
                                    placementZone={item.placementZone}
                                    maxWidth={260}
                                  />
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-2 relative z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openCraftingView(item, 'front');
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-1" /> View Design
                                </Button>
                                {/* Front patch list */}
                                <div className="mt-1 space-y-0.5">
                                  {item.frontPatches?.map((patch) => (
                                    <div key={patch.id} className="text-[10px] text-gray-500 truncate flex justify-between">
                                      <span>• {patch.name}</span>
                                      <span className="text-gray-400">{formatCurrency(patch.price || 0, order.currency)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Back — always show, even if empty */}
                              <div>
                                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">Back</Badge>
                                  <span>{details.backCount} patch(es)</span>
                                </p>
                                <div className="bg-gray-100 rounded-lg p-2">
                                  <DesignPreview
                                    productImage={item.productBackImage || item.productImage || '/placeholder-product.png'}
                                    patches={item.backPatches || []}
                                    placementZone={item.placementZone}
                                    maxWidth={260}
                                  />
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-2 relative z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openCraftingView(item, 'back');
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-1" /> View Design
                                </Button>
                                {/* Back patch list */}
                                <div className="mt-1 space-y-0.5">
                                  {item.backPatches?.map((patch) => (
                                    <div key={patch.id} className="text-[10px] text-gray-500 truncate flex justify-between">
                                      <span>• {patch.name}</span>
                                      <span className="text-gray-400">{formatCurrency(patch.price || 0, order.currency)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Shipping & Actions */}
                    <div className="space-y-4">
                      {/* Shipping Address */}
                      {order.shipping_address && (
                        <div className="bg-white rounded-lg p-4 border shadow-sm">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Shipping Address
                          </h4>
                          <div className="text-sm text-gray-600">
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

                      {/* Fulfillment Actions */}
                      <div className="bg-white rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-3">Fulfillment Actions</h4>
                        
                        <div className="space-y-3">
                          {order.fulfillment_status === 'pending' && (
                            <Button
                              onClick={() => updateFulfillmentStatus(order.id, 'processing')}
                              disabled={updating === order.id}
                              className="w-full bg-blue-500 hover:bg-blue-600"
                            >
                              <Package className="w-4 h-4 mr-2" />
                              Start Processing
                            </Button>
                          )}

                          {order.fulfillment_status === 'processing' && (
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Tracking number (optional)"
                                value={trackingInput[order.id] || ''}
                                onChange={(e) => setTrackingInput(prev => ({ ...prev, [order.id]: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              />
                              <Button
                                onClick={() => updateFulfillmentStatus(order.id, 'shipped')}
                                disabled={updating === order.id}
                                className="w-full bg-purple-500 hover:bg-purple-600"
                              >
                                <Truck className="w-4 h-4 mr-2" />
                                Mark as Shipped
                              </Button>
                            </div>
                          )}

                          {order.fulfillment_status === 'shipped' && (
                            <Button
                              onClick={() => updateFulfillmentStatus(order.id, 'delivered')}
                              disabled={updating === order.id}
                              className="w-full bg-green-500 hover:bg-green-600"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark as Delivered
                            </Button>
                          )}

                          {order.tracking_number && (
                            <div className="text-sm bg-gray-50 p-2 rounded">
                              <span className="text-gray-500">Tracking:</span>{' '}
                              <span className="font-medium">{order.tracking_number}</span>
                            </div>
                          )}

                          {(order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered') && order.shipped_at && (
                            <div className="text-xs text-gray-500">
                              Shipped: {formatDate(order.shipped_at)}
                            </div>
                          )}

                          {order.fulfillment_status === 'delivered' && order.delivered_at && (
                            <div className="text-xs text-gray-500">
                              Delivered: {formatDate(order.delivered_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No orders found</p>
            <p className="text-sm">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Crafting View Modal */}
      {craftingView?.show && (
        <CraftingView
          productName={craftingView.productName}
          productImage={craftingView.productImage}
          productBackImage={craftingView.productBackImage}
          patches={craftingView.patches}
          side={craftingView.side}
          productWidthCm={craftingView.productWidthCm}
          productHeightCm={craftingView.productHeightCm}
          placementZone={craftingView.placementZone}
          onClose={() => setCraftingView(null)}
        />
      )}

      {/* Production Mode Modal */}
      {productionMode?.show && (
        <ProductionMode
          orders={productionMode.orders}
          currentIndex={productionMode.currentIndex}
          onClose={() => setProductionMode(null)}
          onNext={() => setProductionMode(prev => prev ? { ...prev, currentIndex: Math.min(prev.currentIndex + 1, prev.orders.length - 1) } : null)}
          onPrevious={() => setProductionMode(prev => prev ? { ...prev, currentIndex: Math.max(prev.currentIndex - 1, 0) } : null)}
          onMarkComplete={(orderId) => updateFulfillmentStatus(orderId, 'processing')}
          onSkip={() => setProductionMode(prev => prev ? { ...prev, currentIndex: Math.min(prev.currentIndex + 1, prev.orders.length - 1) } : null)}
        />
      )}
    </div>
  );
}

export default AdminOrderManagement;
