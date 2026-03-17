export type TransactionType = 'sale' | 'purchase';

export interface TransactionItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface PaymentRecord {
  amount: number;
  date: string | Date;
  method: string;
  notes?: string;
  status?: 'completed' | 'scheduled';
}

export interface Transaction {
  id: string;
  dbId: string;
  type: TransactionType;
  counterpartName?: string;
  total: number;
  paidAmount?: number;
  scheduledAmount?: number;
  paymentStatus?: string;
  payments?: PaymentRecord[];
  date: string;
  day: string;
  reference?: string;
  itemSummary?: string;
  items: TransactionItem[];
}

