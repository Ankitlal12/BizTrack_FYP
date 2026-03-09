import { Transaction } from './types';

export const printTransactionStatement = (
  transactions: Transaction[],
  filters: {
    dateFrom?: string;
    dateTo?: string;
    filterType?: string;
  }
): void => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  };

  const formatNPR = (amount: number) =>
    'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalSales = transactions
    .filter((t) => t.type === 'sale')
    .reduce((sum, t) => sum + t.total, 0);
  const totalPurchases = transactions
    .filter((t) => t.type === 'purchase')
    .reduce((sum, t) => sum + t.total, 0);
  const netBalance = totalSales - totalPurchases;

  const periodLabel =
    filters.dateFrom && filters.dateTo
      ? `${formatDate(filters.dateFrom)} – ${formatDate(filters.dateTo)}`
      : filters.dateFrom
      ? `From ${formatDate(filters.dateFrom)}`
      : filters.dateTo
      ? `Up to ${formatDate(filters.dateTo)}`
      : 'All Time';

  const typeLabel =
    filters.filterType === 'sale'
      ? 'Sales Only'
      : filters.filterType === 'purchase'
      ? 'Purchases Only'
      : 'All Transactions';

  const rows = transactions
    .map((t) => {
      const isSale = t.type === 'sale';
      return `
        <tr>
          <td>${formatDate(t.date)}</td>
          <td class="day">${t.day}</td>
          <td class="ref">${t.id}</td>
          <td>${t.counterpartName || '—'}</td>
          <td class="desc">${t.itemSummary || t.items.map((i) => i.name).join(', ') || '—'}</td>
          <td class="amount credit">${isSale ? formatNPR(t.total) : ''}</td>
          <td class="amount debit">${!isSale ? formatNPR(t.total) : ''}</td>
        </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Transaction Statement</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; padding: 24px 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a5f; padding-bottom: 14px; margin-bottom: 18px; }
    .company h1 { font-size: 22px; font-weight: 700; color: #1e3a5f; letter-spacing: 1px; }
    .company p { font-size: 10px; color: #555; margin-top: 2px; }
    .statement-title { text-align: right; }
    .statement-title h2 { font-size: 16px; font-weight: 600; color: #1e3a5f; text-transform: uppercase; letter-spacing: 2px; }
    .statement-title p { font-size: 10px; color: #777; margin-top: 3px; }
    .meta { display: flex; gap: 40px; background: #f0f4fa; border-radius: 6px; padding: 10px 16px; margin-bottom: 18px; }
    .meta-item label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; display: block; }
    .meta-item span { font-size: 12px; font-weight: 600; color: #1a1a2e; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    thead tr { background: #1e3a5f; color: #fff; }
    thead th { padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.amount { text-align: right; }
    tbody tr { border-bottom: 1px solid #e8e8f0; }
    tbody tr:nth-child(even) { background: #f7f9fd; }
    tbody td { padding: 7px 10px; vertical-align: top; }
    td.day { color: #888; font-size: 10px; }
    td.ref { font-size: 10px; color: #3b5fa0; font-weight: 500; }
    td.desc { color: #555; font-size: 10px; max-width: 180px; }
    td.amount { text-align: right; font-weight: 500; }
    td.credit { color: #166534; }
    td.debit  { color: #991b1b; }
    .summary { display: flex; justify-content: flex-end; margin-top: 4px; }
    .summary-box { border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; min-width: 280px; }
    .summary-box .row { display: flex; justify-content: space-between; padding: 7px 14px; font-size: 11px; border-bottom: 1px solid #e5e7eb; }
    .summary-box .row:last-child { border-bottom: none; }
    .summary-box .row.net { background: #1e3a5f; color: #fff; font-weight: 700; font-size: 12px; }
    .credit-val { color: #166534; font-weight: 600; }
    .debit-val  { color: #991b1b; font-weight: 600; }
    .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; }
    @media print {
      body { padding: 10px 14px; }
      @page { size: A4; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      <h1>BizTrack</h1>
      <p>Business Management System</p>
      <p>Statement generated on: ${new Date().toLocaleString()}</p>
    </div>
    <div class="statement-title">
      <h2>Transaction Statement</h2>
      <p>Period: ${periodLabel}</p>
      <p>Filter: ${typeLabel}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><label>Total Records</label><span>${transactions.length}</span></div>
    <div class="meta-item"><label>Period</label><span>${periodLabel}</span></div>
    <div class="meta-item"><label>Type</label><span>${typeLabel}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Day</th>
        <th>Ref / ID</th>
        <th>Party</th>
        <th>Description</th>
        <th class="amount">Sales (Dr)</th>
        <th class="amount">Purchase (Cr)</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888;">No transactions found</td></tr>'}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-box">
      <div class="row"><span>Total Sales</span><span class="credit-val">${formatNPR(totalSales)}</span></div>
      <div class="row"><span>Total Purchases</span><span class="debit-val">${formatNPR(totalPurchases)}</span></div>
      <div class="row net"><span>Net Balance</span><span>${formatNPR(netBalance)}</span></div>
    </div>
  </div>

  <div class="footer">
    <span>BizTrack — Confidential</span>
    <span>Printed: ${new Date().toLocaleString()}</span>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }
};

// Build query string for API requests
export const buildTransactionsQueryString = (filters: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  totalMin?: string;
  totalMax?: string;
  sortBy?: string;
  sortOrder?: string;
}): string => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      params.append(key, value.toString());
    }
  });
  
  return params.toString();
};