import { CartLine } from './cart.model';

export interface SavedOrder {
  id: string;
  createdAt: string;
  customerName: string;
  junctionLabel: string;
  shopId: string;
  shopName: string;
  items: CartLine[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}
