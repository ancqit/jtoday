import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { Shop } from '../models/shop.model';
import { ShopTypeInfo } from '../models/shop-type.model';
import { ShopsCatalogStore } from '../stores/shops-catalog.store';

/** Thin facade over {@link ShopsCatalogStore} — cache-first catalog reads. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly store = inject(ShopsCatalogStore);

  getShops(city: string, locality: string): Observable<Shop[]> {
    return this.store.watchShops(city, locality);
  }

  getShopsByCity(city: string): Observable<Shop[]> {
    return this.store.watchShops(city, null);
  }

  getProducts(shopId: string): Observable<Product[]> {
    return this.store.watchProducts(shopId);
  }

  getShopTypes(): Observable<ShopTypeInfo[]> {
    return this.store.watchShopTypes();
  }

  getAllShops(): Observable<Shop[]> {
    return this.store.watchAllShops();
  }
}
