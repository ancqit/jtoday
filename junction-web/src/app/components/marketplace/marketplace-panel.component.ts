import { DatePipe } from '@angular/common';
import { Component, effect, inject, OnInit, output, signal } from '@angular/core';
import { AuthorizedImageComponent } from '../authorized-image/authorized-image.component';
import { ProductGalleryModalComponent } from '../product-gallery-modal/product-gallery-modal.component';
import { ProfileModalComponent } from '../profile-modal/profile-modal.component';
import { Product } from '../../models/product.model';
import { SavedOrder } from '../../models/order.model';
import { Shop } from '../../models/shop.model';
import { resolveProductImageSource, resolveProductImageSources } from '../../core/product-image.util';
import { resolveShopProfileImageSource } from '../../core/shop-image.util';
import { formatShopHours } from '../../core/shop-hours.util';
import { CatalogService } from '../../services/catalog.service';
import { UserSessionService } from '../../services/user-session.service';
import { CartStore } from '../../stores/cart.store';
import { OrderStore } from '../../stores/order.store';

type MarketplaceView = 'shops' | 'products' | 'cart' | 'receipt';
type ShopsLayout = 'card' | 'list';
type ProductsLayout = 'card' | 'list';

@Component({
  selector: 'app-marketplace-panel',
  imports: [DatePipe, AuthorizedImageComponent, ProductGalleryModalComponent, ProfileModalComponent],
  templateUrl: './marketplace-panel.component.html',
  styleUrl: './marketplace-panel.component.scss',
})
export class MarketplacePanelComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  readonly session = inject(UserSessionService);
  readonly cart = inject(CartStore);
  private readonly orders = inject(OrderStore);

  readonly closed = output<void>();

  readonly view = signal<MarketplaceView>('shops');
  readonly shops = signal<Shop[]>([]);
  readonly products = signal<Product[]>([]);
  readonly selectedShop = signal<Shop | null>(null);
  readonly completedOrder = signal<SavedOrder | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly shopsLayout = signal<ShopsLayout>('card');
  readonly productsLayout = signal<ProductsLayout>('card');
  readonly galleryProduct = signal<Product | null>(null);
  readonly checkoutProfileOpen = signal(false);
  readonly actionMessage = signal<string | null>(null);

  private readonly productQuantities = signal<Record<string, number>>({});

  private loadedJunctionKey: string | null = null;

  constructor() {
    effect(() => {
      const junctionKey = this.session.junctionKey();
      if (!junctionKey) {
        return;
      }

      if (this.loadedJunctionKey === null) {
        this.loadedJunctionKey = junctionKey;
        return;
      }

      if (this.loadedJunctionKey !== junctionKey) {
        this.loadedJunctionKey = junctionKey;
        this.openPanel();
      }
    });
  }

  ngOnInit(): void {
    this.openPanel();
  }

  openPanel(): void {
    this.view.set('shops');
    this.selectedShop.set(null);
    this.products.set([]);
    this.completedOrder.set(null);
    this.error.set(null);
    this.loadShops();
  }

  closePanel(): void {
    this.closed.emit();
  }

  back(): void {
    const current = this.view();
    if (current === 'products') {
      this.view.set('shops');
      this.selectedShop.set(null);
      this.products.set([]);
      return;
    }

    if (current === 'cart') {
      this.view.set(this.selectedShop() ? 'products' : 'shops');
      return;
    }

    if (current === 'receipt') {
      this.view.set('shops');
      this.completedOrder.set(null);
      return;
    }

    this.closePanel();
  }

  openCart(): void {
    if (this.cart.isEmpty()) {
      return;
    }

    this.view.set('cart');
  }

  selectShop(shop: Shop): void {
    this.selectedShop.set(shop);
    this.cart.setShop(shop.id, shop.name);
    this.view.set('products');
    this.loadProducts(shop.id);
  }

  addToCart(product: Product): void {
    if (!this.session.hasContactProfile()) {
      this.actionMessage.set('Add your email and phone in Settings before adding items.');
      return;
    }

    this.actionMessage.set(null);
    const quantity = this.productQuantity(product.id);

    this.cart.addProduct(
      {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        unit: product.unit,
        currency: product.currency,
      },
      quantity,
    );
  }

  productQuantity(productId: string): number {
    return this.productQuantities()[productId] ?? 1;
  }

  onProductQuantityInput(productId: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const quantity = Math.max(1, Math.min(99, Math.floor(value) || 1));
    this.productQuantities.update((drafts) => ({
      ...drafts,
      [productId]: quantity,
    }));
  }

  cartQuantityFor(productId: string): number {
    return this.cart.lines().find((line) => line.productId === productId)?.quantity ?? 0;
  }

  setProductsLayout(layout: ProductsLayout): void {
    this.productsLayout.set(layout);
  }

  updateQuantity(productId: string, quantity: number): void {
    this.cart.updateQuantity(productId, quantity);
  }

  placeOrder(): void {
    const profile = this.session.userProfile();
    if (!profile || this.cart.isEmpty()) {
      return;
    }

    if (!this.session.hasContactProfile()) {
      this.checkoutProfileOpen.set(true);
      return;
    }

    if (!profile.authenticated) {
      this.checkoutProfileOpen.set(true);
      return;
    }

    this.completeOrder();
  }

  closeCheckoutProfile(): void {
    this.checkoutProfileOpen.set(false);
  }

  onCheckoutProfileCompleted(): void {
    this.checkoutProfileOpen.set(false);
    this.completeOrder();
  }

  private completeOrder(): void {
    const profile = this.session.userProfile();
    if (!profile || this.cart.isEmpty()) {
      return;
    }

    const order = this.orders.saveFromCart(
      this.cart,
      profile.name,
      this.session.junctionLabel(),
    );
    this.completedOrder.set(order);
    this.view.set('receipt');
  }

  saveReceiptPdf(): void {
    window.print();
  }

  formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  setShopsLayout(layout: ShopsLayout): void {
    this.shopsLayout.set(layout);
  }

  productImageSource(product: Product): string | null {
    return resolveProductImageSource(product);
  }

  productImageSources(product: Product): string[] {
    return resolveProductImageSources(product);
  }

  openProductGallery(product: Product): void {
    if (this.productImageSources(product).length === 0) {
      return;
    }

    this.galleryProduct.set(product);
  }

  closeProductGallery(): void {
    this.galleryProduct.set(null);
  }

  shopHoursLabel(shop: Shop): string | null {
    if (!shop.open_time || !shop.closed_time) {
      return null;
    }

    return formatShopHours(shop.open_time, shop.closed_time);
  }

  shopProfileImageSource(shop: Shop): string | null {
    return resolveShopProfileImageSource(shop);
  }

  shopDescription(shop: Shop): string | null {
    const description = shop.description?.trim();
    return description || null;
  }

  shopCustomerMobile(shop: Shop): string | null {
    if (!shop.show_mobile_number) {
      return null;
    }

    const mobile = shop.mobile_number?.trim();
    return mobile || null;
  }

  private loadShops(): void {
    const profile = this.session.userProfile();
    if (!profile) {
      this.error.set('Choose your Junction first.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // junctionBack GET /shops/by-location?city=&locality= for the active junction profile.
    this.catalog.getShops(profile.city.name, profile.locality.name).subscribe({
      next: (shops) => {
        this.shops.set(shops.filter((shop) => shop.is_open));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load shops for your Junction.');
      },
    });
  }

  private loadProducts(shopId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.catalog.getProducts(shopId).subscribe({
      next: (products) => {
        this.products.set(products.filter((product) => product.status === 'active'));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load products for this shop.');
      },
    });
  }
}
