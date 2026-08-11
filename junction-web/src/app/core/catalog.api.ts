import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { Shop } from '../models/shop.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly api = inject(ApiService);

  shopsByLocation(city: string, locality: string): Observable<Shop[]> {
    return this.api.get<Shop[]>('/shops/by-location', {
      city: city.trim(),
      locality: locality.trim(),
    });
  }

  productsForShop(shopId: string): Observable<Product[]> {
    return this.api.get<Product[]>(`/shops/${shopId}/products`);
  }
}
