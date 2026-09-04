import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of, switchMap, tap } from 'rxjs';
import { CatalogApi } from '../core/catalog.api';
import { SessionService } from '../core/session.service';
import { Product } from '../models/product.model';
import { Shop } from '../models/shop.model';
import { ShopTypeInfo } from '../models/shop-type.model';

function junctionKey(city: string, locality: string | null): string {
  const c = city.trim().toLowerCase();
  const l = (locality ?? '').trim().toLowerCase();
  return l ? `${c}|${l}` : `${c}|*`;
}

/**
 * In-memory shops/products catalog store.
 * Emits the last known list immediately, then refreshes from the API.
 */
@Injectable({ providedIn: 'root' })
export class ShopsCatalogStore {
  private readonly catalogApi = inject(CatalogApi);
  private readonly session = inject(SessionService);

  private readonly byJunction = new Map<string, BehaviorSubject<Shop[]>>();
  private readonly productsByShop = new Map<string, BehaviorSubject<Product[]>>();
  private readonly allShops$ = new BehaviorSubject<Shop[] | null>(null);
  private readonly shopTypes$ = new BehaviorSubject<ShopTypeInfo[] | null>(null);
  private refreshingAll = false;
  private refreshingTypes = false;

  getShopsSnapshot(city: string, locality: string | null): Shop[] {
    return this.subjectFor(city, locality).value;
  }

  setShops(city: string, locality: string | null, shops: Shop[]): void {
    this.subjectFor(city, locality).next(shops);
  }

  /** Watch shops for a junction — cache first, then API. */
  watchShops(city: string, locality: string | null, forceRefresh = false): Observable<Shop[]> {
    const subject = this.subjectFor(city, locality);
    this.refreshJunction(city, locality, forceRefresh);
    return subject.asObservable();
  }

  getAllShopsSnapshot(): Shop[] {
    return this.allShops$.value ?? [];
  }

  setAllShops(shops: Shop[]): void {
    this.allShops$.next(shops);
  }

  watchAllShops(forceRefresh = false): Observable<Shop[]> {
    if (forceRefresh || this.allShops$.value === null || !this.refreshingAll) {
      this.refreshAll(forceRefresh);
    }
    return this.allShops$.asObservable().pipe(
      switchMap((rows) => of(rows ?? [])),
    );
  }

  getProductsSnapshot(shopId: string): Product[] {
    return this.productsSubject(shopId).value;
  }

  setProducts(shopId: string, products: Product[]): void {
    this.productsSubject(shopId).next(products);
  }

  watchProducts(shopId: string, forceRefresh = false): Observable<Product[]> {
    const subject = this.productsSubject(shopId);
    this.refreshProducts(shopId, forceRefresh);
    return subject.asObservable();
  }

  getShopTypesSnapshot(): ShopTypeInfo[] {
    return this.shopTypes$.value ?? [];
  }

  watchShopTypes(forceRefresh = false): Observable<ShopTypeInfo[]> {
    if (forceRefresh || this.shopTypes$.value === null) {
      this.refreshShopTypes(forceRefresh);
    }
    return this.shopTypes$.asObservable().pipe(switchMap((rows) => of(rows ?? [])));
  }

  private subjectFor(city: string, locality: string | null): BehaviorSubject<Shop[]> {
    const key = junctionKey(city, locality);
    let subject = this.byJunction.get(key);
    if (!subject) {
      subject = new BehaviorSubject<Shop[]>([]);
      this.byJunction.set(key, subject);
    }
    return subject;
  }

  private productsSubject(shopId: string): BehaviorSubject<Product[]> {
    const id = shopId.trim();
    let subject = this.productsByShop.get(id);
    if (!subject) {
      subject = new BehaviorSubject<Product[]>([]);
      this.productsByShop.set(id, subject);
    }
    return subject;
  }

  private refreshJunction(city: string, locality: string | null, force: boolean): void {
    void force;
    const subject = this.subjectFor(city, locality);
    const localityName = locality?.trim() ?? '';

    this.session
      .ensureSession()
      .pipe(
        switchMap(() =>
          localityName.length > 0
            ? this.catalogApi.shopsByLocation(city, localityName)
            : this.catalogApi
                .allShops()
                .pipe(
                  switchMap((shops) =>
                    of(
                      shops.filter(
                        (shop) => shop.city.trim().toLowerCase() === city.trim().toLowerCase(),
                      ),
                    ),
                  ),
                ),
        ),
        catchError(() => of(null)),
      )
      .subscribe((shops) => {
        if (shops) {
          subject.next(shops);
        }
      });
  }

  private refreshProducts(shopId: string, force: boolean): void {
    void force;
    const subject = this.productsSubject(shopId);
    this.session
      .ensureSession()
      .pipe(
        switchMap(() => this.catalogApi.productsForShop(shopId)),
        catchError(() => of(null)),
      )
      .subscribe((products) => {
        if (products) {
          subject.next(products);
        }
      });
  }

  private refreshAll(force: boolean): void {
    if (this.refreshingAll && !force) {
      return;
    }
    this.refreshingAll = true;
    this.session
      .ensureSession()
      .pipe(
        switchMap(() => this.catalogApi.allShops()),
        catchError(() => of(null)),
        tap(() => {
          this.refreshingAll = false;
        }),
      )
      .subscribe((shops) => {
        if (shops) {
          this.allShops$.next(shops);
        } else if (this.allShops$.value === null) {
          this.allShops$.next([]);
        }
      });
  }

  private refreshShopTypes(force: boolean): void {
    if (this.refreshingTypes && !force) {
      return;
    }
    this.refreshingTypes = true;
    this.session
      .ensureSession()
      .pipe(
        switchMap(() => this.catalogApi.shopTypes()),
        catchError(() => of(null)),
        tap(() => {
          this.refreshingTypes = false;
        }),
      )
      .subscribe((types) => {
        if (types) {
          this.shopTypes$.next(types);
        } else if (this.shopTypes$.value === null) {
          this.shopTypes$.next([]);
        }
      });
  }
}
