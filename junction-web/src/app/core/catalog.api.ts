import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { Shop } from '../models/shop.model';
import { ShopTypeInfo } from '../models/shop-type.model';
import { ApiService } from './api.service';

/**
 * junctionBack catalog reads (https://github.com/ancqit/junctionBack).
 * Flow: POST /session → GET /shops/by-location → GET /shops/{shop_id}/products
 * Phone visibility uses shop `show_phone`; hide `phone_number` in the UI when false.
 * All catalog routes accept the junction.today session JWT (Bearer).
 */
@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly api = inject(ApiService);

  shopsByLocation(city: string, locality: string): Observable<Shop[]> {
    return this.api.get<Shop[]>('/shops/by-location', {
      city: city.trim(),
      locality: locality.trim(),
    });
  }

  /** junctionBack GET /shops (session JWT) — filter client-side by city. */
  allShops(): Observable<Shop[]> {
    return this.api.get<Shop[]>('/shops');
  }

  productsForShop(shopId: string): Observable<Product[]> {
    return this.api.get<Product[]>(`/shops/${shopId}/products`);
  }

  shopTypes(): Observable<ShopTypeInfo[]> {
    return this.api.get<ShopTypeInfo[]>('/shops/types');
  }
}
