import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { Shop } from '../models/shop.model';
import { CatalogApi } from '../core/catalog.api';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly catalogApi = inject(CatalogApi);

  getShops(city: string, locality: string): Observable<Shop[]> {
    return this.catalogApi.shopsByLocation(city, locality);
  }

  getProducts(shopId: string): Observable<Product[]> {
    return this.catalogApi.productsForShop(shopId);
  }
}
