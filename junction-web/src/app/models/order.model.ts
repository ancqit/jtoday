import { CartLine } from './cart.model';

export type PaymentMethod = 'pay_at_store';

export interface SavedOrder {
  id: string;
  orderNumber?: string;
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
  paymentMethod: PaymentMethod;
  shopNotified: boolean;
}
