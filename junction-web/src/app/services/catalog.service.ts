import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { Product } from '../models/product.model';
import { SessionShopContact } from '../models/session-shop-contact.model';
import { Shop } from '../models/shop.model';
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

  /** junctionBack: GET /shops/{shop_id}/products (session JWT) */
  getProducts(shopId: string): Observable<Product[]> {
    return this.session.ensureSession().pipe(
      switchMap(() => this.catalogApi.productsForShop(shopId)),
    );
  }

  /** junctionBack: GET /session/shops/{shop_id}?show_phone= (session JWT) */
  getShopContact(shopId: string, showPhone: boolean): Observable<SessionShopContact> {
    return this.session.ensureSession().pipe(
      switchMap(() => this.catalogApi.sessionShopContact(shopId, showPhone)),
    );
  }
}
