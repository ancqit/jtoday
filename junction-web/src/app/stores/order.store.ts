import { Injectable, signal } from '@angular/core';
import { SavedOrder } from '../models/order.model';
import { CartStore } from './cart.store';

const ORDERS_KEY = 'junction.today.orders';

@Injectable({ providedIn: 'root' })
export class OrderStore {
  private readonly ordersSignal = signal<SavedOrder[]>(this.loadOrders());

  readonly orders = this.ordersSignal.asReadonly();

  saveOrder(order: SavedOrder, cart: CartStore): SavedOrder {
    const next = [order, ...this.ordersSignal()];
    this.ordersSignal.set(next);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
    cart.clear();
    return order;
  }

  private loadOrders(): SavedOrder[] {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as SavedOrder[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
