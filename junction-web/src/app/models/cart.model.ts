export interface CartLine {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  currency: string;
}

export interface CartSnapshot {
  shopId: string;
  shopName: string;
  lines: CartLine[];
}
