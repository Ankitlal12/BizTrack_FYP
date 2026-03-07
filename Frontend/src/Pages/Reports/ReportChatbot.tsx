import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  data?: any;
}

interface ReportChatbotProps {
  salesData: any[];
  inventoryData: any[];
  totalSales: number;
  totalOrders: number;
  totalItemsSold: number;
  avgOrderValue: number;
  categorySales: Array<{ name: string; value: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  timeRange: string;
  customerRetention?: any;
}

const ReportChatbot: React.FC<ReportChatbotProps> = ({
  salesData,
  inventoryData,
  totalSales,
  totalOrders,
  totalItemsSold,
  avgOrderValue,
  categorySales,
  topProducts,
  timeRange,
  customerRetention,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "👋 Hello! I'm your intelligent Report Assistant.\n\nI can provide detailed insights about your business performance. Try asking me:\n\n• Sales performance and trends\n• Product analysis\n• Inventory status\n• Financial metrics\n• Last 30 days comparison\n• All-time totals",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [last30DaysData, setLast30DaysData] = useState<any>(null);
  const [allTimeData, setAllTimeData] = useState<any>(null);
  const [lastWeekData, setLastWeekData] = useState<any>(null);
  const [lastMonthData, setLastMonthData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch last 30 days and all-time data
  useEffect(() => {
    const fetchAdditionalData = async () => {
      setIsLoadingData(true);
      try {
        const { salesAPI } = await import('../../services/api');
        
        // Fetch last 7 days (last week)
        const endDate = new Date();
        const startDateWeek = new Date();
        startDateWeek.setDate(startDateWeek.getDate() - 7);
        
        const paramsWeek = new URLSearchParams();
        paramsWeek.append('dateFrom', startDateWeek.toISOString());
        paramsWeek.append('dateTo', endDate.toISOString());
        
        const responseWeek = await salesAPI.getAll(paramsWeek.toString());
        const salesWeek = responseWeek.sales || [];
        
        const totalWeekSales = salesWeek.reduce((sum: number, sale: any) => sum + sale.total, 0);
        const totalWeekOrders = salesWeek.length;
        const totalWeekItems = salesWeek.reduce((sum: number, sale: any) => {
          return sum + sale.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0);
        }, 0);
        
        setLastWeekData({
          sales: totalWeekSales,
          orders: totalWeekOrders,
          items: totalWeekItems,
          avgOrder: totalWeekOrders > 0 ? totalWeekSales / totalWeekOrders : 0,
        });
        
        // Fetch last 30 days data
        const startDate30 = new Date();
        startDate30.setDate(startDate30.getDate() - 30);
        
        const params30 = new URLSearchParams();
        params30.append('dateFrom', startDate30.toISOString());
        params30.append('dateTo', endDate.toISOString());
        
        const response30 = await salesAPI.getAll(params30.toString());
        const sales30 = response30.sales || [];
        
        const total30Sales = sales30.reduce((sum: number, sale: any) => sum + sale.total, 0);
        const total30Orders = sales30.length;
        const total30Items = sales30.reduce((sum: number, sale: any) => {
          return sum + sale.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0);
        }, 0);
        
        setLast30DaysData({
          sales: total30Sales,
          orders: total30Orders,
          items: total30Items,
          avgOrder: total30Orders > 0 ? total30Sales / total30Orders : 0,
        });
        
        // Fetch previous month (30-60 days ago)
        const startDatePrevMonth = new Date();
        startDatePrevMonth.setDate(startDatePrevMonth.getDate() - 60);
        const endDatePrevMonth = new Date();
        endDatePrevMonth.setDate(endDatePrevMonth.getDate() - 30);
        
        const paramsPrevMonth = new URLSearchParams();
        paramsPrevMonth.append('dateFrom', startDatePrevMonth.toISOString());
        paramsPrevMonth.append('dateTo', endDatePrevMonth.toISOString());
        
        const responsePrevMonth = await salesAPI.getAll(paramsPrevMonth.toString());
        const salesPrevMonth = responsePrevMonth.sales || [];
        
        const totalPrevMonthSales = salesPrevMonth.reduce((sum: number, sale: any) => sum + sale.total, 0);
        const totalPrevMonthOrders = salesPrevMonth.length;
        const totalPrevMonthItems = salesPrevMonth.reduce((sum: number, sale: any) => {
          return sum + sale.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0);
        }, 0);
        
        setLastMonthData({
          sales: totalPrevMonthSales,
          orders: totalPrevMonthOrders,
          items: totalPrevMonthItems,
          avgOrder: totalPrevMonthOrders > 0 ? totalPrevMonthSales / totalPrevMonthOrders : 0,
        });
        
        // Fetch all-time data (no date filter)
        const responseAll = await salesAPI.getAll('');
        const salesAll = responseAll.sales || [];
        
        const totalAllSales = salesAll.reduce((sum: number, sale: any) => sum + sale.total, 0);
        const totalAllOrders = salesAll.length;
        const totalAllItems = salesAll.reduce((sum: number, sale: any) => {
          return sum + sale.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0);
        }, 0);
        
        setAllTimeData({
          sales: totalAllSales,
          orders: totalAllOrders,
          items: totalAllItems,
          avgOrder: totalAllOrders > 0 ? totalAllSales / totalAllOrders : 0,
        });
      } catch (error) {
        console.error('Error fetching additional data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    if (isOpen) {
      fetchAdditionalData();
    }
  }, [isOpen]);

  const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;
  const getTimePeriod = () => {
    switch(timeRange) {
      case 'week': return 'last 7 days';
      case 'month': return 'last 30 days';
      case 'quarter': return 'last 90 days';
      case 'year': return 'last 365 days';
      default: return 'selected period';
    }
  };

  const calculateGrowth = (current: number, previous: number): { percentage: number; trend: string; emoji: string } => {
    if (previous === 0) {
      return { percentage: current > 0 ? 100 : 0, trend: 'new data', emoji: '🆕' };
    }
    const growth = ((current - previous) / previous) * 100;
    const trend = growth > 0 ? 'growth' : growth < 0 ? 'decline' : 'stable';
    const emoji = growth > 0 ? '📈' : growth < 0 ? '📉' : '➡️';
    return { percentage: Math.abs(growth), trend, emoji };
  };

  const formatGrowth = (current: number, previous: number, label: string): string => {
    const { percentage, trend, emoji } = calculateGrowth(current, previous);
    if (trend === 'new data') return `${emoji} ${label}: ${formatCurrency(current)} (New)`;
    return `${emoji} ${label}: ${formatCurrency(current)} (${trend === 'growth' ? '+' : '-'}${percentage.toFixed(1)}% vs previous)`;
  };

  const analyzeQuestion = (question: string): string => {
    const q = question.toLowerCase();

    // Total sales - detailed
    if (q.includes('total sales') || q.includes('revenue') || q.includes('how much sold')) {
      const avgPerDay = totalSales / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90);
      return `📊 **Sales Performance (${getTimePeriod()})**\n\n` +
        `💰 Total Revenue: ${formatCurrency(totalSales)}\n` +
        `📦 Total Orders: ${totalOrders}\n` +
        `🛍️ Items Sold: ${totalItemsSold}\n` +
        `📈 Average per Day: ${formatCurrency(avgPerDay)}\n` +
        `💳 Average Order Value: ${formatCurrency(avgOrderValue)}\n\n` +
        `${totalSales > 0 ? '✅ Great job! Keep up the momentum!' : '⚠️ No sales recorded in this period.'}`;
    }

    // Orders - detailed
    if (q.includes('how many orders') || q.includes('total orders') || q.includes('number of orders')) {
      const avgItemsPerOrder = totalOrders > 0 ? (totalItemsSold / totalOrders).toFixed(1) : 0;
      return `📦 **Order Analysis (${getTimePeriod()})**\n\n` +
        `Total Orders: ${totalOrders}\n` +
        `Items per Order: ${avgItemsPerOrder} avg\n` +
        `Order Value: ${formatCurrency(avgOrderValue)} avg\n\n` +
        `${totalOrders > 10 ? '🎉 Excellent order volume!' : totalOrders > 0 ? '📈 Good start, aim for more!' : '⚠️ No orders yet.'}`;
    }

    // Top products - detailed with top 5
    if (q.includes('top selling') || q.includes('best selling') || q.includes('most sold') || q.includes('top product')) {
      if (topProducts.length > 0) {
        const top5 = topProducts.slice(0, 5);
        let response = `🏆 **Top Selling Products (${getTimePeriod()})**\n\n`;
        top5.forEach((product, index) => {
          const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📦';
          response += `${emoji} ${index + 1}. ${product.name}\n`;
          response += `   • Quantity: ${product.quantity} units\n`;
          response += `   • Revenue: ${formatCurrency(product.revenue)}\n`;
          response += `   • Avg Price: ${formatCurrency(product.revenue / product.quantity)}\n\n`;
        });
        response += `💡 Tip: Stock up on these popular items!`;
        return response;
      }
      return '⚠️ No sales data available for the selected period.';
    }

    // Category analysis - detailed
    if (q.includes('category') || q.includes('categories')) {
      if (categorySales.length > 0) {
        const totalCategorySales = categorySales.reduce((sum, c) => sum + c.value, 0);
        let response = `📂 **Category Performance (${getTimePeriod()})**\n\n`;
        categorySales.slice(0, 5).forEach((cat, index) => {
          const percentage = ((cat.value / totalCategorySales) * 100).toFixed(1);
          response += `${index + 1}. ${cat.name}\n`;
          response += `   • Sales: ${formatCurrency(cat.value)}\n`;
          response += `   • Share: ${percentage}%\n\n`;
        });
        response += `💡 Focus on top categories for maximum profit!`;
        return response;
      }
      return '⚠️ No category data available.';
    }

    // Low stock - detailed with list
    if (q.includes('low stock') || q.includes('out of stock') || q.includes('stock alert') || q.includes('reorder')) {
      const lowStock = inventoryData.filter(item => item.stock > 0 && item.stock <= item.reorderLevel);
      const outOfStock = inventoryData.filter(item => item.stock === 0);
      const critical = lowStock.filter(item => item.stock < item.reorderLevel * 0.5);
      
      let response = `⚠️ **Inventory Alerts**\n\n`;
      response += `🔴 Out of Stock: ${outOfStock.length} items\n`;
      response += `🟡 Low Stock: ${lowStock.length} items\n`;
      response += `🔥 Critical: ${critical.length} items\n\n`;
      
      if (outOfStock.length > 0) {
        response += `**Out of Stock Items:**\n`;
        outOfStock.slice(0, 5).forEach(item => {
          response += `• ${item.name} (${item.category})\n`;
        });
        if (outOfStock.length > 5) response += `...and ${outOfStock.length - 5} more\n`;
        response += `\n`;
      }
      
      if (critical.length > 0) {
        response += `**Critical Stock Items:**\n`;
        critical.slice(0, 5).forEach(item => {
          response += `• ${item.name}: ${item.stock} units (Min: ${item.reorderLevel})\n`;
        });
        if (critical.length > 5) response += `...and ${critical.length - 5} more\n`;
      }
      
      response += `\n🚨 Action Required: Reorder these items immediately!`;
      return response;
    }

    // Inventory value - detailed
    if (q.includes('inventory value') || q.includes('stock value') || q.includes('inventory worth')) {
      const totalCostValue = inventoryData.reduce((sum, item) => sum + (item.cost * item.stock), 0);
      const totalSellingValue = inventoryData.reduce((sum, item) => sum + (item.price * item.stock), 0);
      const potentialProfit = totalSellingValue - totalCostValue;
      const totalItems = inventoryData.reduce((sum, item) => sum + item.stock, 0);
      
      return `💰 **Inventory Valuation**\n\n` +
        `📦 Total Items: ${totalItems} units\n` +
        `💵 Cost Value: ${formatCurrency(totalCostValue)}\n` +
        `💎 Selling Value: ${formatCurrency(totalSellingValue)}\n` +
        `📈 Potential Profit: ${formatCurrency(potentialProfit)}\n` +
        `📊 Profit Margin: ${((potentialProfit / totalSellingValue) * 100).toFixed(1)}%\n\n` +
        `💡 This is your inventory's potential if all items sell!`;
    }

    // Profit analysis - detailed
    if (q.includes('profit') || q.includes('margin') || q.includes('earnings')) {
      const estimatedCost = totalSales * 0.6; // Assuming 60% cost
      const estimatedProfit = totalSales * 0.4; // 40% profit
      const profitMargin = 40;
      
      return `💹 **Profit Analysis (${getTimePeriod()})**\n\n` +
        `💰 Total Revenue: ${formatCurrency(totalSales)}\n` +
        `💸 Estimated Cost: ${formatCurrency(estimatedCost)}\n` +
        `✨ Estimated Profit: ${formatCurrency(estimatedProfit)}\n` +
        `📊 Profit Margin: ~${profitMargin}%\n\n` +
        `💡 Note: This is an estimate. Check Financial Summary for accurate data.`;
    }

    // Customer retention analysis
    if (q.includes('customer retention') || q.includes('customer loyalty') || q.includes('retention rate')) {
      if (!customerRetention) {
        return '⏳ Customer retention data is loading... Please try again in a moment.';
      }
      
      return `👥 **Customer Retention Analysis (${getTimePeriod()})**\n\n` +
        `🔄 Retention Rate: ${customerRetention.overview.retentionRate}%\n` +
        `🔁 Repeat Customer Rate: ${customerRetention.overview.repeatCustomerRate}%\n` +
        `📊 Total Customers: ${customerRetention.overview.totalCustomers}\n` +
        `🆕 New Customers: ${customerRetention.overview.newCustomers}\n` +
        `↩️ Returning Customers: ${customerRetention.overview.returningCustomers}\n\n` +
        `💰 Avg Customer Lifetime Value: ${formatCurrency(customerRetention.overview.avgCustomerLifetimeValue)}\n` +
        `⏱️ Avg Days Between Purchases: ${Math.round(customerRetention.overview.avgDaysBetweenPurchases)} days\n\n` +
        `${customerRetention.overview.retentionRate > 60 ? '🎉 Excellent retention! Your customers love coming back!' : 
          customerRetention.overview.retentionRate > 30 ? '📈 Good retention rate, but there\'s room for improvement!' : 
          '⚠️ Low retention rate. Consider loyalty programs or customer engagement strategies.'}`;
    }

    // Customer segmentation
    if (q.includes('customer segment') || q.includes('customer types') || q.includes('customer groups')) {
      if (!customerRetention) {
        return '⏳ Customer segmentation data is loading... Please try again in a moment.';
      }
      
      return `🎯 **Customer Segmentation Analysis**\n\n` +
        `💎 High Value Customers: ${customerRetention.segmentation.highValueCustomers}\n` +
        `🌟 Recent Active Customers: ${customerRetention.segmentation.recentCustomers}\n` +
        `⚠️ At Risk Customers: ${customerRetention.segmentation.atRiskCustomers}\n` +
        `🛍️ One-time Buyers: ${customerRetention.segmentation.oneTimeBuyers}\n\n` +
        `**Recommendations:**\n` +
        `• Reward high-value customers with exclusive offers\n` +
        `• Re-engage at-risk customers with personalized campaigns\n` +
        `• Convert one-time buyers into repeat customers\n` +
        `• Maintain regular communication with recent customers`;
    }

    // Top customers
    if (q.includes('top customer') || q.includes('best customer') || q.includes('valuable customer')) {
      if (!customerRetention || !customerRetention.topCustomers) {
        return '⏳ Top customer data is loading... Please try again in a moment.';
      }
      
      if (customerRetention.topCustomers.length === 0) {
        return '📊 No customer data available yet.';
      }
      
      let response = `🏆 **Top Customers by Value**\n\n`;
      customerRetention.topCustomers.slice(0, 5).forEach((customer: any, index: number) => {
        const emoji = index === 0 ? '👑' : index === 1 ? '🥇' : index === 2 ? '🥈' : index === 3 ? '🥉' : '⭐';
        response += `${emoji} ${index + 1}. ${customer.name}\n`;
        response += `   • Total Spent: ${formatCurrency(customer.totalSpent)}\n`;
        response += `   • Total Orders: ${customer.totalPurchases}\n`;
        response += `   • Last Purchase: ${customer.daysSinceLastPurchase} days ago\n`;
        response += `   • Customer Since: ${customer.firstPurchase}\n\n`;
      });
      response += `💡 Nurture these valuable relationships with personalized service!`;
      return response;
    }

    // Customer lifecycle
    if (q.includes('customer lifecycle') || q.includes('customer journey') || q.includes('customer behavior')) {
      if (!customerRetention) {
        return '⏳ Customer lifecycle data is loading... Please try again in a moment.';
      }
      
      return `📈 **Customer Lifecycle Analysis**\n\n` +
        `🆕 **Acquisition:**\n` +
        `• New customers this period: ${customerRetention.overview.newCustomers}\n` +
        `• Total customers acquired: ${customerRetention.overview.totalCustomers}\n\n` +
        `🔄 **Retention:**\n` +
        `• Retention rate: ${customerRetention.overview.retentionRate}%\n` +
        `• Repeat purchase rate: ${customerRetention.overview.repeatCustomerRate}%\n\n` +
        `💰 **Value:**\n` +
        `• Average CLV: ${formatCurrency(customerRetention.overview.avgCustomerLifetimeValue)}\n` +
        `• Purchase frequency: Every ${Math.round(customerRetention.overview.avgDaysBetweenPurchases)} days\n\n` +
        `🎯 **Recommendations:**\n` +
        `• Focus on converting one-time buyers to repeat customers\n` +
        `• Implement loyalty programs for high-value segments\n` +
        `• Use personalized marketing for better retention`;
    }

    // Performance summary
    if (q.includes('summary') || q.includes('overview') || q.includes('performance')) {
      const avgPerDay = totalSales / (timeRange === 'week' ? 7 : 30);
      const topProduct = topProducts[0]?.name || 'N/A';
      const topCategory = categorySales[0]?.name || 'N/A';
      
      return `📊 **Business Performance Summary (${getTimePeriod()})**\n\n` +
        `**Sales Metrics:**\n` +
        `• Revenue: ${formatCurrency(totalSales)}\n` +
        `• Orders: ${totalOrders}\n` +
        `• Items Sold: ${totalItemsSold}\n` +
        `• Daily Average: ${formatCurrency(avgPerDay)}\n\n` +
        `**Top Performers:**\n` +
        `• Best Product: ${topProduct}\n` +
        `• Top Category: ${topCategory}\n\n` +
        `**Inventory Status:**\n` +
        `• Total Items: ${inventoryData.length}\n` +
        `• Low Stock: ${inventoryData.filter(i => i.stock <= i.reorderLevel).length}\n\n` +
        `${totalSales > 0 ? '✅ Business is performing well!' : '⚠️ Focus on increasing sales.'}`;
    }

    // Recommendations
    if (q.includes('recommend') || q.includes('suggestion') || q.includes('advice') || q.includes('improve')) {
      const lowStockCount = inventoryData.filter(i => i.stock <= i.reorderLevel).length;
      const topProduct = topProducts[0]?.name || 'N/A';
      
      return `💡 **Business Recommendations**\n\n` +
        `**Immediate Actions:**\n` +
        `${lowStockCount > 0 ? `• 🔴 Reorder ${lowStockCount} low stock items\n` : ''}` +
        `${topProducts.length > 0 ? `• 📦 Stock more of "${topProduct}"\n` : ''}` +
        `${avgOrderValue < 500 ? `• 💰 Increase average order value (currently ${formatCurrency(avgOrderValue)})\n` : ''}` +
        `\n**Growth Strategies:**\n` +
        `• 📈 Promote top-selling categories\n` +
        `• 🎯 Bundle slow-moving items with bestsellers\n` +
        `• 💳 Offer discounts for bulk purchases\n` +
        `• 📱 Improve customer experience\n` +
        `• 📊 Ask me for "last 30 days" or "all time" stats\n\n` +
        `Keep monitoring your reports for better insights!`;
    }

    // Week vs Week comparison
    if (q.includes('this week') || q.includes('last week') || (q.includes('week') && (q.includes('compare') || q.includes('vs')))) {
      if (!lastWeekData) {
        return '⏳ Loading week data... Please wait a moment and try again.';
      }
      
      const weekGrowth = calculateGrowth(totalSales, lastWeekData.sales);
      
      return `� **Week Comparison**\n\n` +
        `**Current Week (${getTimePeriod()}):**\n` +
        `• Revenue: ${formatCurrency(totalSales)}\n` +
        `• Orders: ${totalOrders}\n` +
        `• Items: ${totalItemsSold}\n\n` +
        `**Last Week:**\n` +
        `• Revenue: ${formatCurrency(lastWeekData.sales)}\n` +
        `• Orders: ${lastWeekData.orders}\n` +
        `• Items: ${lastWeekData.items}\n\n` +
        `**Growth Analysis:**\n` +
        `${weekGrowth.emoji} Revenue ${weekGrowth.trend}: ${weekGrowth.percentage.toFixed(1)}%\n` +
        `${weekGrowth.trend === 'growth' ? '✅ Great progress!' : weekGrowth.trend === 'decline' ? '⚠️ Need improvement' : '➡️ Stable performance'}\n\n` +
        `💡 ${weekGrowth.trend === 'growth' ? 'Keep up the momentum!' : 'Focus on boosting sales this week!'}`;
    }

    // Month vs Month comparison
    if (q.includes('this month') || q.includes('last month') || (q.includes('month') && (q.includes('compare') || q.includes('vs') || q.includes('growth')))) {
      if (!last30DaysData || !lastMonthData) {
        return '⏳ Loading month data... Please wait a moment and try again.';
      }
      
      const monthGrowth = calculateGrowth(last30DaysData.sales, lastMonthData.sales);
      const orderGrowth = calculateGrowth(last30DaysData.orders, lastMonthData.orders);
      
      return `📅 **Month-over-Month Comparison**\n\n` +
        `**This Month (Last 30 Days):**\n` +
        `• Revenue: ${formatCurrency(last30DaysData.sales)}\n` +
        `• Orders: ${last30DaysData.orders}\n` +
        `• Items: ${last30DaysData.items}\n` +
        `• Avg Order: ${formatCurrency(last30DaysData.avgOrder)}\n\n` +
        `**Previous Month (30-60 Days Ago):**\n` +
        `• Revenue: ${formatCurrency(lastMonthData.sales)}\n` +
        `• Orders: ${lastMonthData.orders}\n` +
        `• Items: ${lastMonthData.items}\n` +
        `• Avg Order: ${formatCurrency(lastMonthData.avgOrder)}\n\n` +
        `**Growth Metrics:**\n` +
        `${monthGrowth.emoji} Revenue: ${monthGrowth.trend === 'growth' ? '+' : '-'}${monthGrowth.percentage.toFixed(1)}%\n` +
        `${orderGrowth.emoji} Orders: ${orderGrowth.trend === 'growth' ? '+' : '-'}${orderGrowth.percentage.toFixed(1)}%\n\n` +
        `**Performance:**\n` +
        `${monthGrowth.trend === 'growth' ? '🎉 Excellent! Revenue is growing!' : monthGrowth.trend === 'decline' ? '📊 Revenue declined. Time to strategize!' : '➡️ Stable performance'}\n\n` +
        `💡 ${monthGrowth.trend === 'growth' ? 'Maintain this growth trajectory!' : 'Consider promotions or new marketing strategies!'}`;
    }

    // Trend analysis
    if (q.includes('trend') || q.includes('growing') || q.includes('declining') || q.includes('how am i doing')) {
      if (!last30DaysData || !lastMonthData) {
        return '⏳ Loading trend data... Please wait a moment and try again.';
      }
      
      const revenueGrowth = calculateGrowth(last30DaysData.sales, lastMonthData.sales);
      const orderGrowth = calculateGrowth(last30DaysData.orders, lastMonthData.orders);
      
      let trendSummary = '';
      if (revenueGrowth.trend === 'growth' && orderGrowth.trend === 'growth') {
        trendSummary = '🚀 **Excellent!** Both revenue and orders are growing. Your business is on an upward trajectory!';
      } else if (revenueGrowth.trend === 'growth' && orderGrowth.trend !== 'growth') {
        trendSummary = '📈 **Good!** Revenue is growing even though order volume is stable. You\'re increasing average order value!';
      } else if (revenueGrowth.trend === 'decline' && orderGrowth.trend === 'decline') {
        trendSummary = '⚠️ **Attention Needed!** Both revenue and orders are declining. Time to implement growth strategies!';
      } else if (revenueGrowth.trend === 'decline') {
        trendSummary = '📊 **Mixed Results:** Revenue is down but orders are stable. Consider reviewing pricing or product mix.';
      } else {
        trendSummary = '➡️ **Stable:** Business is maintaining steady performance.';
      }
      
      return `📊 **Business Trend Analysis**\n\n` +
        `${trendSummary}\n\n` +
        `**Month-over-Month Changes:**\n` +
        `${revenueGrowth.emoji} Revenue: ${revenueGrowth.trend === 'growth' ? '+' : '-'}${revenueGrowth.percentage.toFixed(1)}%\n` +
        `${orderGrowth.emoji} Orders: ${orderGrowth.trend === 'growth' ? '+' : '-'}${orderGrowth.percentage.toFixed(1)}%\n\n` +
        `**Key Metrics:**\n` +
        `• Current Month Revenue: ${formatCurrency(last30DaysData.sales)}\n` +
        `• Previous Month Revenue: ${formatCurrency(lastMonthData.sales)}\n` +
        `• All-Time Revenue: ${allTimeData ? formatCurrency(allTimeData.sales) : 'Loading...'}\n\n` +
        `💡 Keep tracking these trends to make data-driven decisions!`;
    }

    // General comparison
    if (q.includes('compare') || q.includes('comparison') || q.includes('vs') || q.includes('versus')) {
      if (!last30DaysData || !allTimeData) {
        return '⏳ Loading comparison data... Please wait a moment and try again.';
      }
      
      return `📊 **Performance Comparison**\n\n` +
        `**Current Period (${getTimePeriod()}):**\n` +
        `• Revenue: ${formatCurrency(totalSales)}\n` +
        `• Orders: ${totalOrders}\n` +
        `• Items: ${totalItemsSold}\n\n` +
        `**Last 30 Days:**\n` +
        `• Revenue: ${formatCurrency(last30DaysData.sales)}\n` +
        `• Orders: ${last30DaysData.orders}\n` +
        `• Items: ${last30DaysData.items}\n\n` +
        `**All-Time Total:**\n` +
        `• Revenue: ${formatCurrency(allTimeData.sales)}\n` +
        `• Orders: ${allTimeData.orders}\n` +
        `• Items: ${allTimeData.items}\n\n` +
        `💡 Try asking: "Compare this month vs last month" or "Show me trends"`;
    }

    // Help
    if (q.includes('help') || q.includes('what can you') || q === '?') {
      return `🤖 **I can help you with:**\n\n` +
        `📊 **Sales & Revenue:**\n` +
        `• Total sales analysis\n` +
        `• Order statistics\n` +
        `• Average order value\n` +
        `• Last 30 days & all-time data\n\n` +
        `📈 **Trends & Comparisons:**\n` +
        `• Week vs week comparison\n` +
        `• Month vs month growth\n` +
        `• Business trend analysis\n` +
        `• Growth metrics\n\n` +
        `🏆 **Product Insights:**\n` +
        `• Top selling products\n` +
        `• Category performance\n` +
        `• Product recommendations\n\n` +
        `📦 **Inventory:**\n` +
        `• Stock alerts\n` +
        `• Inventory valuation\n` +
        `• Reorder suggestions\n\n` +
        `� **Customer Analytics:**\n` +
        `• Customer retention analysis\n` +
        `• Customer segmentation\n` +
        `• Top customers by value\n` +
        `• Customer lifecycle insights\n\n` +
        `�💰 **Financial:**\n` +
        `• Profit analysis\n` +
        `• Margin calculations\n` +
        `• Business summary\n\n` +
        `Just ask me anything!`;
    }

    // Default with smart suggestions
    return `🤔 I'm not quite sure about that.\n\n` +
      `**Try asking:**\n` +
      `• "Show me trends"\n` +
      `• "Compare this month vs last month"\n` +
      `• "How am I doing?"\n` +
      `• "What are my total sales?"\n` +
      `• "Top selling products"\n` +
      `• "Which items are low on stock?"\n` +
      `• "Business summary"\n` +
      `• "Any recommendations?"\n\n` +
      `Type "help" to see all I can do!`;
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const botResponse: Message = {
        id: messages.length + 2,
        text: analyzeQuestion(inputText),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 800);

    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "📊 Business summary",
    "📈 Show me trends",
    "📅 Compare months",
    "🏆 Top products",
    "⚠️ Low stock items",
    "💰 Profit analysis",
  ];

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-full p-4 shadow-2xl transition-all hover:scale-110 z-50 group"
          title="Ask Report Assistant"
        >
          <MessageCircle className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
          </span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-8 right-8 w-[420px] h-[650px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Report Assistant</h3>
                <p className="text-xs text-teal-50">Powered by Smart Analytics</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-lg p-2 transition-colors"
              aria-label="Close chatbot"
              title="Close chatbot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                      : 'bg-white border border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.sender === 'bot' && (
                      <Bot className="w-5 h-5 mt-0.5 flex-shrink-0 text-teal-600" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-line leading-relaxed">{message.text}</p>
                      <p className={`text-xs mt-2 ${message.sender === 'user' ? 'text-teal-100' : 'text-gray-400'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {message.sender === 'user' && (
                      <User className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-teal-600" />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-600 font-medium mb-2">💡 Quick questions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputText(question);
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-xs bg-white hover:bg-teal-50 text-gray-700 hover:text-teal-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-teal-300 transition-all text-left"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl px-4 py-3 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                aria-label="Send message"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ReportChatbot;
