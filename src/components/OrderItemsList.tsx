import { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { Package, Eye, Loader2 } from 'lucide-react';
import { db } from '../lib/supabase';

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  patches: string[];
  design_image_url?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  // Joined data
  product_name?: string;
}

interface OrderItemsListProps {
  orderId: string;
  orderItemsJson?: Array<{
    name: string;
    qty: number;
    price: number;
    patches?: string[];
    productImage?: string;
    design_image_url?: string;
    frontPatches?: any[];
    backPatches?: any[];
  }>;
  currency?: string;
  compact?: boolean;
}

export function OrderItemsList({ orderId, orderItemsJson, currency: currencyProp, compact = false }: OrderItemsListProps) {
  const { currency: contextCurrency } = useCurrency();
  const currency = currencyProp || contextCurrency;
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadOrderItems();
  }, [orderId]);

  const loadOrderItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await db.orderItems.getByOrderId(orderId);
      if (error) throw error;
      
      const items = data || [];
      setOrderItems(items);

      // Fetch product names for the items
      const productIds = [...new Set(items.map(item => item.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        const { data: products } = await db.products.list();
        const nameMap: Record<string, string> = {};
        products?.forEach(p => {
          nameMap[p.id] = p.name;
        });
        setProductNames(nameMap);
      }
    } catch (err: any) {
      console.error('Failed to load order items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    // Amount is stored in dollars (not cents)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-pink" />
        <span className="ml-2 text-sm text-gray-500">Loading items...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 py-2">
        Error loading items: {error}
      </div>
    );
  }

  // Use JSON items as fallback if no database items found
  const displayItems = orderItems.length > 0 ? orderItems : (orderItemsJson || []).map((item, idx) => ({
    id: `json-${idx}`,
    order_id: orderId,
    product_id: '',
    patches: item.patches || [],
    design_image_url: item.design_image_url,
    quantity: item.qty,
    unit_price: item.price,
    total_price: item.price * item.qty,
    created_at: '',
    product_name: item.name,
  }));

  if (displayItems.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2 flex items-center gap-2">
        <Package className="w-4 h-4" />
        No items found for this order
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {displayItems.map((item, idx) => (
          <div key={item.id || idx} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-2">
              {item.design_image_url && (
                <button
                  onClick={() => setSelectedImage(item.design_image_url!)}
                  className="text-pink hover:text-pink-600"
                  title="View design"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              <span className="font-medium">
                {item.product_name || productNames[item.product_id] || `Product ${idx + 1}`}
              </span>
              <span className="text-gray-400">×</span>
              <span className="text-gray-600">{item.quantity}</span>
            </div>
            <span className="font-medium">{formatCurrency(item.total_price)}</span>
          </div>
        ))}

        {/* Image Preview Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-2xl w-full">
              <img 
                src={selectedImage} 
                alt="Design" 
                className="w-full h-auto rounded-lg"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-800 hover:bg-gray-100"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
        <Package className="w-4 h-4" />
        Order Items ({displayItems.length})
      </h4>
      
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Product</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600">Qty</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">Unit Price</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">Total</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600">Design</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayItems.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div>
                    <p className="font-medium">
                      {item.product_name || productNames[item.product_id] || `Product ${idx + 1}`}
                    </p>
                    {item.patches && item.patches.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.patches.length} patch{item.patches.length > 1 ? 'es' : ''}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">{item.quantity}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                <td className="px-3 py-2 text-center">
                  {item.design_image_url ? (
                    <button
                      onClick={() => setSelectedImage(item.design_image_url!)}
                      className="inline-flex items-center gap-1 text-pink hover:text-pink-600 text-xs"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total:</td>
              <td className="px-3 py-2 text-right font-bold">
                {formatCurrency(displayItems.reduce((sum, item) => sum + item.total_price, 0))}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="Design" 
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-200 text-sm flex items-center gap-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderItemsList;
