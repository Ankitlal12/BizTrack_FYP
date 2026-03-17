import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Layout from '../layout/Layout';
import { inventoryAPI, salesAPI } from '../services/api';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Warehouse, Package, TrendingDown, AlertTriangle,
  RefreshCw, Download, DollarSign, BarChart2, Calendar
} from 'lucide-react';
import DatePresets from '../components/DatePresets';

const COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

const toLocalDate = (d: Date) => d.toLocaleDateString('en-CA');

interface StockItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  reorderLevel: number;
}

interface CategoryStock {
  name: string;
  itemCount: number;
  totalUnits: number;
  costValue: number;
  sellValue: number;
}

interface DeadStockItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  cost: number;
  totalValue: number;
}

interface TurnoverItem {
  name: string;
  sku: string;
  stock: number;
  soldQty: number;
  turnoverRate: number;
}

const StockReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<StockItem[]>([]);

  // Date range (default: last 30 days)
  const defaultTo = toLocalDate(new Date());
  const defaultFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return toLocalDate(d); })();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  // Summary metrics
  const [totalStockCostValue, setTotalStockCostValue] = useState(0);
  const [totalStockSellValue, setTotalStockSellValue] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);

  // Derived tables
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryStock[]>([]);
  const [deadStock, setDeadStock] = useState<DeadStockItem[]>([]);
  const [turnoverData, setTurnoverData] = useState<TurnoverItem[]>([]);
  const [topValueItems, setTopValueItems] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    try {
      setLoading(true);

      const startDate = new Date(dateFrom + 'T00:00:00');
      const endDate = new Date(dateTo + 'T23:59:59');
      const params = new URLSearchParams();
      params.append('dateFrom', startDate.toISOString());
      params.append('dateTo', endDate.toISOString());

      const [inventoryResponse, salesResponse] = await Promise.all([
        inventoryAPI.getAll(),
        salesAPI.getAll(params.toString()),
      ]);

      const inv: StockItem[] = inventoryResponse || [];
      const sales = salesResponse.sales || [];

      setInventory(inv);
      calculateMetrics(inv, sales);

    } catch (err: any) {
      console.error('Error loading stock report:', err);
      toast.error('Failed to load stock report data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (inv: StockItem[], sales: any[]) => {
    // Aggregate total units sold per inventory item over last 30 days
    const soldMap = new Map<string, number>();
    sales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const id = item.inventoryId?._id?.toString() || item.inventoryId?.toString() || item.name;
        soldMap.set(id, (soldMap.get(id) || 0) + item.quantity);
      });
    });

    // Summary metrics
    let costVal = 0, sellVal = 0, units = 0, lowStock = 0, outOfStock = 0;
    inv.forEach(item => {
      costVal += item.cost * item.stock;
      sellVal += item.price * item.stock;
      units += item.stock;
      if (item.stock <= 0) outOfStock++;
      else if (item.stock <= item.reorderLevel) lowStock++;
    });
    setTotalStockCostValue(costVal);
    setTotalStockSellValue(sellVal);
    setTotalUnits(units);
    setLowStockCount(lowStock);
    setOutOfStockCount(outOfStock);

    // Category breakdown
    const catMap = new Map<string, CategoryStock>();
    inv.forEach(item => {
      const cat = item.category || 'Uncategorized';
      const existing = catMap.get(cat) || { name: cat, itemCount: 0, totalUnits: 0, costValue: 0, sellValue: 0 };
      catMap.set(cat, {
        name: cat,
        itemCount: existing.itemCount + 1,
        totalUnits: existing.totalUnits + item.stock,
        costValue: existing.costValue + item.cost * item.stock,
        sellValue: existing.sellValue + item.price * item.stock,
      });
    });
    setCategoryBreakdown(Array.from(catMap.values()).sort((a, b) => b.costValue - a.costValue));

    // Dead stock: items with stock > 0 and zero sales in last 30 days
    const dead: DeadStockItem[] = inv
      .filter(item => {
        if (item.stock <= 0) return false;
        const sold = soldMap.get(item._id?.toString()) || soldMap.get(item.name) || 0;
        return sold === 0;
      })
      .map(item => ({
        _id: item._id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        stock: item.stock,
        cost: item.cost,
        totalValue: item.cost * item.stock,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
    setDeadStock(dead);

    // Stock turnover (sold / current stock, higher = faster moving)
    const turnover: TurnoverItem[] = inv
      .filter(item => item.stock > 0)
      .map(item => {
        const sold = soldMap.get(item._id?.toString()) || soldMap.get(item.name) || 0;
        return {
          name: item.name,
          sku: item.sku,
          stock: item.stock,
          soldQty: sold,
          turnoverRate: item.stock > 0 ? parseFloat((sold / item.stock).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => b.turnoverRate - a.turnoverRate)
      .slice(0, 10);
    setTurnoverData(turnover);

    // Top items by stock value
    const topVal = inv
      .map(item => ({ name: item.name, sku: item.sku, category: item.category, stock: item.stock, costValue: item.cost * item.stock }))
      .sort((a, b) => b.costValue - a.costValue)
      .slice(0, 10);
    setTopValueItems(topVal);
  };

  const exportDeadStockCSV = () => {
    const headers = ['Name', 'SKU', 'Category', 'Stock', 'Cost Price', 'Total Value'];
    const rows = deadStock.map(item => [
      item.name, item.sku, item.category,
      item.stock, item.cost.toFixed(2), item.totalValue.toFixed(2)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dead-stock-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Dead stock report exported');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const potentialProfit = totalStockSellValue - totalStockCostValue;

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Control Report</h1>
            <p className="text-gray-600">Inventory value, dead stock, and stock turnover analysis</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={exportDeadStockCSV}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              <Download className="w-4 h-4" />
              Export Dead Stock
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Sales Period:</span>
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={e => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  max={toLocalDate(new Date())}
                  onChange={e => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <DatePresets onSelect={(from, to) => { setDateFrom(from); setDateTo(to); }} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Stock Cost Value</span>
              <DollarSign className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">₹{totalStockCostValue.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-1">At cost price</p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Stock Sell Value</span>
              <BarChart2 className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">₹{totalStockSellValue.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-1">At selling price</p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Potential Profit</span>
              <Warehouse className="w-5 h-5 text-green-600" />
            </div>
            <p className={`text-2xl font-bold ${potentialProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ₹{potentialProfit.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">If all stock sold</p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Units</span>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalUnits.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Across {inventory.length} products</p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Stock Alerts</span>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex gap-3 mt-1">
              <div>
                <p className="text-xl font-bold text-red-600">{outOfStockCount}</p>
                <p className="text-xs text-gray-500">Out of stock</p>
              </div>
              <div className="border-l pl-3">
                <p className="text-xl font-bold text-orange-500">{lowStockCount}</p>
                <p className="text-xs text-gray-500">Low stock</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Table */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Units</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost Value</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sell Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categoryBreakdown.map(cat => (
                    <tr key={cat.name} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{cat.name}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{cat.itemCount}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{cat.totalUnits}</td>
                      <td className="px-3 py-2 text-right text-gray-700">₹{cat.costValue.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right font-medium text-teal-700">₹{cat.sellValue.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t font-semibold">
                  <tr>
                    <td className="px-3 py-2 text-gray-700">Total</td>
                    <td className="px-3 py-2 text-right text-gray-700">{inventory.length}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{totalUnits}</td>
                    <td className="px-3 py-2 text-right text-gray-800">₹{totalStockCostValue.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right text-teal-800">₹{totalStockSellValue.toFixed(0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Category pie chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Value by Category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryBreakdown.map(c => ({ name: c.name, value: c.costValue }))}
                  cx="40%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {categoryBreakdown.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `₹${Number(v).toFixed(2)}`} />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Turnover Rate */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Stock Turnover Rate ({dateFrom === dateTo ? dateFrom : `${dateFrom} – ${dateTo}`})</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Higher = faster moving</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={turnoverData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: any, name?: string) => [
                  name === 'turnoverRate' ? `${Number(v).toFixed(2)}x` : v,
                  name === 'turnoverRate' ? 'Turnover Rate' : name === 'soldQty' ? 'Units Sold' : (name ?? '')
                ]}
              />
              <Legend />
              <Bar dataKey="soldQty" fill="#0d9488" name="Units Sold (30d)" />
              <Bar dataKey="stock" fill="#93c5fd" name="Current Stock" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dead Stock */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              Dead Stock (Zero Sales: {dateFrom === dateTo ? dateFrom : `${dateFrom} – ${dateTo}`})
            </h3>
            <span className="text-sm text-gray-500 bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-200">
              {deadStock.length} item{deadStock.length !== 1 ? 's' : ''}
            </span>
          </div>

          {deadStock.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No dead stock — all items had at least one sale in the selected period</p>
            </div>
          ) : (
            <>
              <div className="mb-3 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
                Total value tied up in dead stock: <strong>₹{deadStock.reduce((s, i) => s + i.totalValue, 0).toFixed(2)}</strong>
                &nbsp;— consider promotions or discounts to free up capital.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deadStock.map(item => (
                      <tr key={item._id} className="hover:bg-red-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-3 text-gray-600">{item.category}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{item.stock}</td>
                        <td className="px-4 py-3 text-right text-gray-700">₹{item.cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-700">₹{item.totalValue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Top Items by Stock Value */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Items by Stock Value</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topValueItems} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${Number(v).toLocaleString()}`} />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => `₹${Number(v).toFixed(2)}`} />
              <Bar dataKey="costValue" fill="#0d9488" name="Stock Value (₹)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </Layout>
  );
};

export default StockReport;
