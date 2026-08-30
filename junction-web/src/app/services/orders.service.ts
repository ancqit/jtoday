import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { CreateOrderPayload, OrdersApi } from '../core/orders.api';
import { CartStore } from '../stores/cart.store';
import { SavedOrder } from '../models/order.model';
import { UserProfile } from '../models/location.model';

/** Normalize to E.164 for junctionBack customer_phone, or omit if unknown. */
function toE164Phone(raw?: string | null): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  const compact = raw.replace(/[^\d+]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return undefined;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly ordersApi = inject(OrdersApi);

  submitPayAtStoreOrder(
    cart: CartStore,
    profile: UserProfile,
    junctionLabel: string,
  ): Observable<SavedOrder> {
    const shopId = cart.shopId();
    const shopName = cart.shopName();

    if (!shopId || !shopName || cart.isEmpty()) {
      throw new Error('Cart is empty');
    }

    const subtotal = cart.subtotal();
    const taxAmount = cart.taxAmount();
    const totalAmount = cart.totalAmount();
    const currency = cart.currency();

    const payload: CreateOrderPayload = {
      store_id: shopId,
      customer_name: profile.name.trim(),
      customer_phone: toE164Phone(profile.phoneNumber),
      customer_email: profile.email?.trim() || undefined,
      items: cart.lines().map((line) => ({
        product_id: line.productId,
        product_name: line.productName,
        sku: line.sku,
        quantity: line.quantity,
        unit_price: line.unitPrice,
      })),
      billing: {
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency,
        payment_method: 'cash',
        payment_status: 'pending',
      },
      status: 'pending',
      source: 'junction.today',
      notes: 'Pay at store — customer will pay when collecting the order.',
    };

    const localFallback: SavedOrder = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      customerName: profile.name.trim(),
      junctionLabel,
      shopId,
      shopName,
      items: cart.lines().map((line) => ({ ...line })),
      subtotal,
      taxAmount,
      totalAmount,
      currency,
      paymentMethod: 'pay_at_store',
      shopNotified: false,
    };

    return this.ordersApi.create(payload).pipe(
      map((created) => ({
        ...localFallback,
        id: created.id,
        orderNumber: created.order_number,
        shopNotified: true,
      })),
      catchError(() => of(localFallback)),
    );
  }
}
