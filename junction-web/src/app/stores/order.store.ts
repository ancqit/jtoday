import { Injectable, signal } from '@angular/core';
import { SavedOrder } from '../models/order.model';
import { CartStore } from './cart.store';

/** In-memory saved orders for this session (no localStorage). */
@Injectable({ providedIn: 'root' })
export class OrderStore {
  private readonly ordersSignal = signal<SavedOrder[]>([]);

  readonly orders = this.ordersSignal.asReadonly();

  get snapshot(): SavedOrder[] {
    return this.ordersSignal();
  }

  setOrders(orders: SavedOrder[]): void {
    this.ordersSignal.set(orders);
  }

  saveOrder(order: SavedOrder, cart: CartStore): SavedOrder {
    const next = [order, ...this.ordersSignal()];
    this.ordersSignal.set(next);
    cart.clear();
    return order;
  }
}
