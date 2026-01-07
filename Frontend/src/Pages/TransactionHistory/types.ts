export type TransactionType = 'sale' | 'purchase';

export interface TransactionItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Transaction {
  id: string;
  dbId: string;
  type: TransactionType;
  counterpartName?: string;
  total: number;
  date: string;
  day: string;
  reference?: string;
  itemSummary?: string;
  items: TransactionItem[];
}

