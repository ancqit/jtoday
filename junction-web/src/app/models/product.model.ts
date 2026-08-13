import { ProductImage } from './product-image.model';

export interface Product {
  id: string;
  store_id: string;
  sku: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  currency: string;
  stock_quantity: number;
  unit: string;
  status: string;
  image_url?: string | null;
  image_cdn?: string | null;
  image?: ProductImage | null;
  images?: ProductImage[];
}
