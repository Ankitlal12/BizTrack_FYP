import { Invoice, InvoiceFilters } from './types';

export const formatCurrency = (amount: number): string => {
  return `Rs ${amount.toFixed(2)}`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'sent':
      return 'bg-blue-100 text-blue-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getPaymentStatusColor = (paymentStatus: string): string => {
  switch (paymentStatus) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'unpaid':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getTypeColor = (type: string): string => {
  switch (type) {
    case 'sale':
      return 'bg-blue-100 text-blue-800';
    case 'purchase':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const isOverdue = (invoice: Invoice): boolean => {
  if (invoice.paymentStatus === 'paid') return false;
  return new Date(invoice.dueDate) < new Date();
};

export const calculateRemainingAmount = (invoice: Invoice): number => {
  return invoice.total - invoice.paidAmount;
};

export const buildQueryString = (filters: InvoiceFilters): string => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });
  
  return params.toString();
};

export const getInvoiceTypeLabel = (type: string): string => {
  switch (type) {
    case 'sale':
      return 'Sales Invoice';
    case 'purchase':
      return 'Purchase Invoice';
    default:
      return 'Invoice';
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'sent':
      return 'Sent';
    case 'paid':
      return 'Paid';
    case 'partial':
      return 'Partially Paid';
    case 'overdue':
      return 'Overdue';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

export const getPaymentStatusLabel = (paymentStatus: string): string => {
  switch (paymentStatus) {
    case 'unpaid':
      return 'Unpaid';
    case 'partial':
      return 'Partially Paid';
    case 'paid':
      return 'Paid';
    default:
      return paymentStatus;
  }
};

export const generateInvoicePDF = (invoice: Invoice): void => {
  // This would integrate with a PDF generation library
  // For now, we'll open a print dialog
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(generateInvoiceHTML(invoice));
    printWindow.document.close();
    printWindow.print();
  }
};

const generateInvoiceHTML = (invoice: Invoice): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .totals { text-align: right; }
        .total-row { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${getInvoiceTypeLabel(invoice.type)}</h1>
        <h2>${invoice.invoiceNumber}</h2>
      </div>
      
      <div class="invoice-details">
        <div>
          <h3>Bill To:</h3>
          <p><strong>${invoice.customerName}</strong></p>
          ${invoice.customerEmail ? `<p>${invoice.customerEmail}</p>` : ''}
          ${invoice.customerPhone ? `<p>${invoice.customerPhone}</p>` : ''}
        </div>
        <div>
          <p><strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}</p>
          <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
          <p><strong>Status:</strong> ${getStatusLabel(invoice.status)}</p>
        </div>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.price)}</td>
              <td>${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <p>Subtotal: ${formatCurrency(invoice.subtotal)}</p>
        ${invoice.tax > 0 ? `<p>Tax: ${formatCurrency(invoice.tax)}</p>` : ''}
        ${invoice.discount > 0 ? `<p>Discount: -${formatCurrency(invoice.discount)}</p>` : ''}
        ${invoice.shipping && invoice.shipping > 0 ? `<p>Shipping: ${formatCurrency(invoice.shipping)}</p>` : ''}
        <p class="total-row">Total: ${formatCurrency(invoice.total)}</p>
        <p>Paid: ${formatCurrency(invoice.paidAmount)}</p>
        <p class="total-row">Balance: ${formatCurrency(calculateRemainingAmount(invoice))}</p>
      </div>
      
      ${invoice.notes ? `<div><h3>Notes:</h3><p>${invoice.notes}</p></div>` : ''}
    </body>
    </html>
  `;
};