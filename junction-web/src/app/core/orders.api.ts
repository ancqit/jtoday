import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { SKIP_SESSION_AUTH } from './http-context';

export interface OrderLineItemPayload {
  product_id?: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
}

export interface OrderBillingPayload {
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  payment_method: 'cash';
  payment_status: 'pending';
}

export interface CreateOrderPayload {
  store_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  items: OrderLineItemPayload[];
  billing: OrderBillingPayload;
  status: 'pending';
  notes?: string;
}

export interface CreatedOrder {
  id: string;
  order_number: string;
  store_id: string;
  customer_name: string;
  status: string;
  created_at: string;
}

/**
 * junctionBack POST /orders — create order and notify the shop.
 * Documented as public; sent without session JWT so customer orders are not blocked.
 */
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly api = inject(ApiService);
  private readonly publicContext = new HttpContext().set(SKIP_SESSION_AUTH, true);

  create(payload: CreateOrderPayload): Observable<CreatedOrder> {
    return this.api.post<CreatedOrder>('/orders', payload, { context: this.publicContext });
  }
}
