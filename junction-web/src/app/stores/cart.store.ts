import { Injectable, computed, signal } from '@angular/core';
import { CartLine } from '../models/cart.model';

const TAX_RATE = 0.05;

@Injectable({ providedIn: 'root' })
export class CartStore {
  readonly shopId = signal<string | null>(null);
  readonly shopName = signal<string | null>(null);
  readonly lines = signal<CartLine[]>([]);

  readonly itemCount = computed(() =>
    this.lines().reduce((total, line) => total + line.quantity, 0),
  );

  readonly subtotal = computed(() =>
    this.lines().reduce((total, line) => total + line.unitPrice * line.quantity, 0),
  );

  readonly taxAmount = computed(() => Math.round(this.subtotal() * TAX_RATE * 100) / 100);

  readonly totalAmount = computed(() => Math.round((this.subtotal() + this.taxAmount()) * 100) / 100);

  readonly currency = computed(() => this.lines()[0]?.currency ?? 'INR');

  readonly isEmpty = computed(() => this.lines().length === 0);

  setShop(shopId: string, shopName: string): void {
    const currentShop = this.shopId();
    if (currentShop && currentShop !== shopId) {
      this.clear();
    }

    this.shopId.set(shopId);
    this.shopName.set(shopName);
  }

  addProduct(
    product: {
      id: string;
      name: string;
      sku: string;
      price: number;
      unit: string;
      currency: string;
    },
    quantity = 1,
  ): void {
    const amount = Math.max(1, Math.floor(quantity));
    const existing = this.lines().find((line) => line.productId === product.id);
    if (existing) {
      this.lines.update((lines) =>
        lines.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: line.quantity + amount }
            : line,
        ),
      );
      return;
    }

    this.lines.update((lines) => [
      ...lines,
      {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPrice: product.price,
        quantity: amount,
        unit: product.unit,
        currency: product.currency,
      },
    ]);
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeLine(productId);
      return;
    }

    this.lines.update((lines) =>
      lines.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
    );
  }

  removeLine(productId: string): void {
    this.lines.update((lines) => lines.filter((line) => line.productId !== productId));
  }

  clear(): void {
    this.shopId.set(null);
    this.shopName.set(null);
    this.lines.set([]);
  }
}
