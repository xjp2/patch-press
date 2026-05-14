import { useState, useEffect } from 'react';
import { 
  History, Loader2, Package, Download, ArrowDown, ArrowUp, 
  Minus, Search, ChevronLeft, ChevronRight, RefreshCw 
} from 'lucide-react';
import { db, supabase } from '../lib/supabase';

interface InventoryLog {
  id: string;
  product_id: string;
  item_type: 'product' | 'patch';
  change_amount: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  order_id?: string;
  created_at: string;
  // Joined data
  product_name?: string;
}

interface InventoryLogsViewerProps {
  productId?: string;
  compact?: boolean;
  maxItems?: number;
}

export function InventoryLogsViewer({ productId, compact = false, maxItems = 50 }: InventoryLogsViewerProps) {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<Record<string, { name: string; type: 'product' | 'patch' }>>({});
  const [filterReason, setFilterReason] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = compact ? 5 : 10;

  useEffect(() => {
    loadLogs();
    loadProductNames();
  }, [productId]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await db.inventory.getLogs(productId, maxItems);
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Failed to load inventory logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProductNames = async () => {
    try {
      // Load both products and patches
      const [productsRes, patchesRes] = await Promise.all([
        supabase.from('products').select('id, name'),
        supabase.from('patches').select('id, name')
      ]);

      const nameMap: Record<string, { name: string; type: 'product' | 'patch' }> = {};
      
      productsRes.data?.forEach(p => {
        nameMap[p.id] = { name: p.name, type: 'product' };
      });
      
      patchesRes.data?.forEach(p => {
        nameMap[p.id] = { name: p.name, type: 'patch' };
      });

      setProductNames(nameMap);
    } catch (err) {
      console.error('Failed to load product names:', err);
    }
  };

  const getChangeIcon = (amount: number) => {
    if (amount > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (amount < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (amount: number) => {
    if (amount > 0) return 'text-green-600 bg-green-50';
    if (amount < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Product', 'Type', 'Previous Qty', 'Change', 'New Qty', 'Reason', 'Order ID'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      productNames[log.product_id]?.name || log.product_id,
      productNames[log.product_id]?.type || 'unknown',
      log.previous_quantity,
      log.change_amount,
      log.new_quantity,
      log.reason,
      log.order_id || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesReason = !filterReason || log.reason.toLowerCase().includes(filterReason.toLowerCase());
    const matchesSearch = !searchQuery || 
      (productNames[log.product_id]?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.order_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesReason && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-pink" />
        <span className="ml-2 text-gray-600">Loading inventory history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Error loading inventory logs: {error}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent Changes
          </h4>
          <button
            onClick={loadLogs}
            className="p-1.5 text-gray-400 hover:text-pink rounded-lg hover:bg-pink/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {paginatedLogs.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No inventory changes recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {paginatedLogs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  {getChangeIcon(log.change_amount)}
                  <div>
                    <p className="font-medium truncate max-w-[120px]">
                      {productNames[log.product_id]?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getChangeColor(log.change_amount)}`}>
                    {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {log.previous_quantity} → {log.new_quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-pink" />
          Inventory History
          <span className="text-sm font-normal text-gray-500">
            ({filteredLogs.length} entries)
          </span>
        </h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={loadLogs}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search product, reason, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-pink/20 focus:border-pink"
          />
        </div>
        <select
          value={filterReason}
          onChange={(e) => setFilterReason(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-pink/20 focus:border-pink"
        >
          <option value="">All reasons</option>
          <option value="Order">Orders</option>
          <option value="restock">Restock</option>
          <option value="adjustment">Manual adjustment</option>
          <option value="return">Returns</option>
        </select>
      </div>

      {/* Logs Table */}
      {paginatedLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No inventory logs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Previous</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Change</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">New</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedLogs.map((log) => {
                const productInfo = productNames[log.product_id];
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {productInfo?.name || log.product_id.slice(0, 8) + '...'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs capitalize
                        ${log.item_type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {log.item_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {log.previous_quantity}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getChangeColor(log.change_amount)}`}>
                        {getChangeIcon(log.change_amount)}
                        {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {log.new_quantity}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-700">{log.reason}</p>
                        {log.order_id && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Order: {log.order_id.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InventoryLogsViewer;
