import { Injectable, inject } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { Product } from '../models/product.model';
import { Shop } from '../models/shop.model';
import { ShopTypeInfo } from '../models/shop-type.model';
import { CatalogApi } from '../core/catalog.api';
import { SessionService } from '../core/session.service';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly catalogApi = inject(CatalogApi);
  private readonly session = inject(SessionService);

  /** junctionBack: GET /shops/by-location?city=&locality= (session JWT) */
  getShops(city: string, locality: string): Observable<Shop[]> {
    return this.session.ensureSession().pipe(
      switchMap(() => this.catalogApi.shopsByLocation(city, locality)),
    );
  }

  /** junctionBack: GET /shops (session JWT), filtered to one city. */
  getShopsByCity(city: string): Observable<Shop[]> {
    const cityName = city.trim().toLowerCase();
    return this.session.ensureSession().pipe(
      switchMap(() => this.catalogApi.allShops()),
      map((shops) =>
        shops.filter((shop) => shop.city.trim().toLowerCase() === cityName),
      ),
    );
  }

  /** junctionBack: GET /shops/{shop_id}/products (session JWT) */
  getProducts(shopId: string): Observable<Product[]> {
    return this.session.ensureSession().pipe(
      switchMap(() => this.catalogApi.productsForShop(shopId)),
    );
  }

  /** junctionBack: GET /shops/types (session JWT) */
  getShopTypes(): Observable<ShopTypeInfo[]> {
    return this.session.ensureSession().pipe(
      switchMap(() => this.catalogApi.shopTypes()),
    );
  }

  /** junctionBack: GET /shops (session JWT) — full public catalog for meta enrichment. */
  getAllShops(): Observable<Shop[]> {
    return this.session.ensureSession().pipe(switchMap(() => this.catalogApi.allShops()));
  }
}
