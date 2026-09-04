import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, output, signal } from '@angular/core';
import { AuthorizedImageComponent } from '../authorized-image/authorized-image.component';
import { ProductGalleryModalComponent } from '../product-gallery-modal/product-gallery-modal.component';
import { ProfileModalComponent } from '../profile-modal/profile-modal.component';
import {
  SearchableOption,
  SearchableSelectComponent,
} from '../searchable-select/searchable-select.component';
import { ShopProfileModalComponent } from '../shop-profile-modal/shop-profile-modal.component';
import { BlogComment, BlogEntry, BlogAuthorKind, BlogShopIdentity } from '../../models/blog.model';
import { Product } from '../../models/product.model';
import { SavedOrder } from '../../models/order.model';
import { Shop } from '../../models/shop.model';
import { ShopTypeInfo } from '../../models/shop-type.model';
import {
  ProductImageRef,
  resolveProductImageRefs,
  resolveProductImageSource,
} from '../../core/product-image.util';
import { resolveShopProfileImageSource } from '../../core/shop-image.util';
import { formatShopHours } from '../../core/shop-hours.util';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BlogService } from '../../services/blog.service';
import { CatalogService } from '../../services/catalog.service';
import { NoticesService } from '../../services/notices.service';
import { OrdersService } from '../../services/orders.service';
import { UserSessionService } from '../../services/user-session.service';
import { CartStore } from '../../stores/cart.store';
import { OrderStore } from '../../stores/order.store';

type MarketplaceView = 'shops' | 'products' | 'cart' | 'receipt';
type ShopsLayout = 'card' | 'list';
type ProductsLayout = 'card' | 'list';

interface InvoiceValidityRow {
  label: string;
  ok: boolean;
}

@Component({
  selector: 'app-marketplace-panel',
  imports: [
    DatePipe,
    AuthorizedImageComponent,
    ProductGalleryModalComponent,
    ProfileModalComponent,
    SearchableSelectComponent,
    ShopProfileModalComponent,
    TranslatePipe,
  ],
  templateUrl: './marketplace-panel.component.html',
  styleUrl: './marketplace-panel.component.scss',
})
export class MarketplacePanelComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly blogsService = inject(BlogService);
  private readonly notices = inject(NoticesService);
  private readonly ordersService = inject(OrdersService);
  private readonly i18n = inject(I18nService);
  readonly session = inject(UserSessionService);
  readonly cart = inject(CartStore);
  private readonly orders = inject(OrderStore);

  readonly closed = output<void>();

  readonly view = signal<MarketplaceView>('shops');
  /** When true, show Junction blogs; when false, show shops. */
  readonly blogOpen = signal(false);
  readonly shops = signal<Shop[]>([]);
  readonly blogs = signal<BlogEntry[]>([]);
  readonly products = signal<Product[]>([]);
  readonly selectedShop = signal<Shop | null>(null);
  readonly selectedBlogNumber = signal<number | null>(null);
  readonly completedOrder = signal<SavedOrder | null>(null);
  readonly loading = signal(false);
  readonly blogsLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly blogsError = signal<string | null>(null);
  readonly shopsLayout = signal<ShopsLayout>('card');
  readonly productsLayout = signal<ProductsLayout>('card');
  readonly galleryProduct = signal<Product | null>(null);
  readonly profileShop = signal<Shop | null>(null);
  readonly checkoutProfileOpen = signal(false);
  readonly actionMessage = signal<string | null>(null);
  readonly shopNotices = signal<Record<string, string>>({});
  readonly shopTypes = signal<ShopTypeInfo[]>([]);
  readonly activeShopType = signal<string | null>(null);
  readonly activeProductCategory = signal<string | null>(null);
  readonly activeProductTag = signal<string | null>(null);
  readonly placingOrder = signal(false);
  readonly paymentMethod = signal<'pay_at_store'>('pay_at_store');
  readonly commentDrafts = signal<Record<number, string>>({});
  readonly commentingBlogNumber = signal<number | null>(null);
  readonly commentError = signal<string | null>(null);
  readonly commentAuthorKind = signal<BlogAuthorKind>('person');
  readonly commentNameDraft = signal('');
  readonly commentShopPhone = signal('');
  readonly commentShopIdentity = signal<BlogShopIdentity | null>(null);
  readonly verifyingCommentShop = signal(false);
  readonly commentMenuKey = signal<string | null>(null);
  readonly editingCommentKey = signal<string | null>(null);
  readonly editCommentDraft = signal('');
  readonly createJunction = signal('');
  readonly createName = signal('');
  readonly createBody = signal('');
  readonly createAuthorKind = signal<BlogAuthorKind>('person');
  readonly createShopPhone = signal('');
  readonly createShopIdentity = signal<BlogShopIdentity | null>(null);
  readonly verifyingCreateShop = signal(false);
  readonly creatingBlog = signal(false);
  readonly createBlogError = signal<string | null>(null);
  readonly createBlogSheetOpen = signal(false);

  private readonly productQuantities = signal<Record<string, number>>({});

  private loadedJunctionKey: string | null = null;
  private loadedBlogJunctionKey: string | null = null;

  /** Categories derived from currently loaded shops (deduped). */
  readonly shopTypeFilterOptions = computed<SearchableOption[]>(() => {
    const byValue = new Map<string, string>();
    for (const shop of this.shops()) {
      const typeValue = shop.shop_type?.trim() || '';
      const labelValue = shop.shop_type_label?.trim() || '';
      // Prefer type as value; if only label exists, use label for both.
      const value = typeValue || labelValue;
      if (!value) {
        continue;
      }
      const label = labelValue || value;
      if (!byValue.has(value)) {
        byValue.set(value, label);
      }
    }
    // Prefer catalog labels when value matches.
    for (const type of this.shopTypes()) {
      if (byValue.has(type.value) && type.label?.trim()) {
        byValue.set(type.value, type.label.trim());
      }
    }
    return [...byValue.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly filteredShops = computed(() => {
    const type = this.activeShopType();
    if (!type) {
      return this.shops();
    }
    return this.shops().filter((shop) => {
      const shopValue = shop.shop_type?.trim() || shop.shop_type_label?.trim() || '';
      return shopValue === type;
    });
  });

  readonly productCategories = computed(() => {
    const categories = new Set<string>();
    for (const product of this.products()) {
      const category = product.category?.trim();
      if (category) {
        categories.add(category);
      }
    }
    return [...categories].sort((a, b) => a.localeCompare(b));
  });

  readonly productCategoryFilterOptions = computed<SearchableOption[]>(() =>
    this.productCategories().map((category) => ({ value: category, label: category })),
  );

  /** Local profile already OTP-verified — orders can proceed without another SMS. */
  readonly isVerifiedForOrders = computed(() => Boolean(this.session.userProfile()?.authenticated));

  readonly productTags = computed(() => {
    const tags = new Set<string>();
    for (const product of this.products()) {
      for (const tag of product.tags ?? []) {
        const trimmed = tag.trim();
        if (trimmed) {
          tags.add(trimmed);
        }
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b));
  });

  readonly filteredProducts = computed(() => {
    const category = this.activeProductCategory();
    const tag = this.activeProductTag();
    return this.products().filter((product) => {
      if (category && product.category !== category) {
        return false;
      }
      if (tag && !(product.tags ?? []).includes(tag)) {
        return false;
      }
      return true;
    });
  });

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
    this.catalog.getShopTypes().subscribe({
      next: (types) => this.shopTypes.set(types),
    });
    this.openPanel();
  }

  openPanel(): void {
    this.view.set('shops');
    this.blogOpen.set(false);
    this.createBlogSheetOpen.set(false);
    this.selectedShop.set(null);
    this.selectedBlogNumber.set(null);
    this.products.set([]);
    this.blogs.set([]);
    this.completedOrder.set(null);
    this.error.set(null);
    this.blogsError.set(null);
    this.commentError.set(null);
    this.commentDrafts.set({});
    this.commentingBlogNumber.set(null);
    this.shopNotices.set({});
    this.activeShopType.set(null);
    this.activeProductCategory.set(null);
    this.activeProductTag.set(null);
    this.profileShop.set(null);
    this.loadedBlogJunctionKey = null;
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
    this.activeProductCategory.set(null);
    this.activeProductTag.set(null);
    this.loadProducts(shop.id);
  }

  openShopProfile(shop: Shop, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.profileShop.set(shop);
  }

  closeShopProfile(): void {
    this.profileShop.set(null);
  }

  setShopTypeFilter(type: string | null): void {
    this.activeShopType.set(type);
  }

  setProductCategoryFilter(category: string | null): void {
    this.activeProductCategory.set(category);
    this.activeProductTag.set(null);
  }

  setProductTagFilter(tag: string | null): void {
    this.activeProductTag.set(tag);
    this.activeProductCategory.set(null);
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

    // Local DB first: if this device already verified the shopper, go straight to order.
    if (this.isVerifiedForOrders()) {
      this.completeOrder();
      return;
    }

    // Otherwise collect / confirm contact, then SMS OTP.
    this.checkoutProfileOpen.set(true);
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

    this.placingOrder.set(true);
    this.error.set(null);

    this.ordersService
      .submitPayAtStoreOrder(this.cart, profile, this.session.junctionLabel())
      .subscribe({
        next: (order) => {
          const saved = this.orders.saveOrder(order, this.cart);
          this.completedOrder.set(saved);
          this.placingOrder.set(false);
          this.view.set('receipt');
        },
        error: () => {
          this.placingOrder.set(false);
          this.error.set('Unable to place your order right now. Please try again.');
        },
      });
  }

  async saveReceiptPdf(): Promise<void> {
    const order = this.completedOrder();
    if (!order) {
      return;
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = margin;
    const line = (text: string, opts?: { bold?: boolean; size?: number }) => {
      doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
      doc.setFontSize(opts?.size ?? 10);
      doc.text(text, margin, y);
      y += (opts?.size ?? 10) + 6;
    };

    line('TAX INVOICE', { bold: true, size: 16 });
    line('Issued for Junction Today · assessed against CGST Rules, 2017 — Rule 46', { size: 9 });
    y += 4;
    line(`Invoice No: ${order.orderNumber || order.id.slice(0, 12).toUpperCase()}`, { bold: true });
    line(`Date of issue: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`);
    y += 6;
    line('Supplier (shop)', { bold: true });
    line(order.shopName);
    line(order.junctionLabel);
    line(`GSTIN: ${this.invoiceGstin(order)}`);
    y += 6;
    line('Recipient (buyer)', { bold: true });
    line(order.customerName);
    line(order.junctionLabel);
    line('Payment: Pay at store');
    y += 8;
    line('Description / Qty / Rate / Taxable', { bold: true });
    for (const item of order.items) {
      line(
        `${item.productName}  |  HSN: —  |  Qty ${item.quantity}  |  ${this.formatMoney(item.unitPrice, item.currency)}  |  ${this.formatMoney(item.unitPrice * item.quantity, item.currency)}`,
      );
    }
    y += 8;
    line(`Taxable value: ${this.formatMoney(order.subtotal, order.currency)}`, { bold: true });
    line(`Tax (CGST/SGST or IGST): ${this.formatMoney(order.taxAmount, order.currency)}`);
    line(`Total: ${this.formatMoney(order.totalAmount, order.currency)}`, { bold: true, size: 12 });
    y += 10;
    line('Official validity check (Rule 46)', { bold: true });
    for (const row of this.invoiceValidity(order)) {
      line(`${row.ok ? '[OK]' : '[MISSING]'} ${row.label}`, { size: 9 });
    }
    y += 6;
    const summary = this.invoiceValiditySummary(order);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const wrapped = doc.splitTextToSize(summary, 515);
    doc.text(wrapped, margin, y);

    const fileName = `junction-invoice-${order.orderNumber || order.id.slice(0, 8)}.pdf`;
    doc.save(fileName);
  }

  invoiceGstin(order: SavedOrder): string {
    const shop = this.shops().find((item) => item.id === order.shopId);
    if (shop?.gst_verified) {
      return 'Verified on shop profile (GSTIN on owner record)';
    }
    return 'Not on invoice — supplier GSTIN missing';
  }

  invoiceValidity(order: SavedOrder): InvoiceValidityRow[] {
    const shop = this.shops().find((item) => item.id === order.shopId);
    return [
      { label: 'Supplier name & address / Junction', ok: Boolean(order.shopName?.trim() && order.junctionLabel?.trim()) },
      { label: 'Supplier GSTIN (Rule 46(a))', ok: Boolean(shop?.gst_verified) },
      { label: 'Consecutive invoice / order number', ok: Boolean(order.orderNumber || order.id) },
      { label: 'Date of issue', ok: Boolean(order.createdAt) },
      { label: 'Recipient name', ok: Boolean(order.customerName?.trim()) },
      { label: 'Description of goods', ok: order.items.length > 0 },
      { label: 'Quantity of goods', ok: order.items.every((item) => item.quantity > 0) },
      { label: 'Taxable value', ok: order.subtotal >= 0 },
      { label: 'Rate / amount of tax', ok: order.taxAmount >= 0 },
      { label: 'HSN / SAC codes', ok: false },
      { label: 'Place of supply (inter-State)', ok: Boolean(order.junctionLabel?.trim()) },
      { label: 'Signature / digital signature', ok: false },
    ];
  }

  invoiceValiditySummary(order: SavedOrder): string {
    const rows = this.invoiceValidity(order);
    const missing = rows.filter((row) => !row.ok).length;
    if (missing === 0) {
      return 'This PDF meets the Rule 46 particulars available on Junction Today.';
    }
    return `Not a complete GST tax invoice yet: ${missing} Rule 46 particulars are missing or provisional. Treat as a Junction order bill until supplier GSTIN, HSN, and authorised signature are present.`;
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

  /** Toggle Junction blogs on/off (off returns to shops). */
  toggleBlogPanel(): void {
    const next = !this.blogOpen();
    this.blogOpen.set(next);
    this.commentError.set(null);
    this.createBlogError.set(null);
    this.commentMenuKey.set(null);
    if (next) {
      this.seedCreateForm();
      this.loadBlogs(false);
    } else {
      this.selectedBlogNumber.set(null);
      this.closeCreateBlogSheet();
    }
  }

  openCreateBlogSheet(): void {
    this.seedCreateForm();
    this.createBlogError.set(null);
    this.createBlogSheetOpen.set(true);
  }

  closeCreateBlogSheet(): void {
    this.createBlogSheetOpen.set(false);
    this.createBlogError.set(null);
  }

  toggleBlogEntry(entry: BlogEntry): void {
    this.selectedBlogNumber.update((current) =>
      current === entry.blogNumber ? null : entry.blogNumber,
    );
    this.commentError.set(null);
    this.commentMenuKey.set(null);
  }

  isBlogExpanded(entry: BlogEntry): boolean {
    return this.selectedBlogNumber() === entry.blogNumber;
  }

  menuKey(blogNumber: number, commentId: string): string {
    return `${blogNumber}:${commentId}`;
  }

  canManageComment(comment: BlogComment): boolean {
    const person = this.resolvePersonCommentIdentity();
    if (
      person &&
      person.creatorNumber === comment.creatorNumber &&
      person.nameTag.toLowerCase() === comment.nameTag.toLowerCase()
    ) {
      return true;
    }
    const shop = this.commentShopIdentity();
    if (
      shop &&
      shop.creator_number === comment.creatorNumber &&
      shop.name_tag.toLowerCase() === comment.nameTag.toLowerCase()
    ) {
      return true;
    }
    const createShop = this.createShopIdentity();
    return Boolean(
      createShop &&
        createShop.creator_number === comment.creatorNumber &&
        createShop.name_tag.toLowerCase() === comment.nameTag.toLowerCase(),
    );
  }

  commentDraft(blogNumber: number): string {
    return this.commentDrafts()[blogNumber] ?? '';
  }

  onCommentDraftInput(blogNumber: number, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.commentDrafts.update((drafts) => ({ ...drafts, [blogNumber]: value }));
  }

  onCommentNameInput(event: Event): void {
    this.commentNameDraft.set((event.target as HTMLInputElement).value);
  }

  onCommentShopPhoneInput(event: Event): void {
    this.commentShopPhone.set((event.target as HTMLInputElement).value);
    this.commentShopIdentity.set(null);
  }

  setCommentAuthorKind(kind: BlogAuthorKind): void {
    this.commentAuthorKind.set(kind);
    this.commentError.set(null);
  }

  setCreateAuthorKind(kind: BlogAuthorKind): void {
    this.createAuthorKind.set(kind);
    this.createBlogError.set(null);
  }

  onCreateJunctionInput(event: Event): void {
    this.createJunction.set((event.target as HTMLInputElement).value);
  }

  onCreateNameInput(event: Event): void {
    this.createName.set((event.target as HTMLInputElement).value);
  }

  onCreateBodyInput(event: Event): void {
    this.createBody.set((event.target as HTMLTextAreaElement).value);
  }

  onCreateShopPhoneInput(event: Event): void {
    this.createShopPhone.set((event.target as HTMLInputElement).value);
    this.createShopIdentity.set(null);
  }

  onEditCommentDraftInput(event: Event): void {
    this.editCommentDraft.set((event.target as HTMLTextAreaElement).value);
  }

  toggleCommentMenu(blogNumber: number, commentId: string, event: Event): void {
    event.stopPropagation();
    const key = this.menuKey(blogNumber, commentId);
    this.commentMenuKey.update((current) => (current === key ? null : key));
  }

  startEditComment(entry: BlogEntry, comment: BlogComment): void {
    this.commentMenuKey.set(null);
    this.editingCommentKey.set(this.menuKey(entry.blogNumber, comment.id));
    this.editCommentDraft.set(comment.body);
  }

  cancelEditComment(): void {
    this.editingCommentKey.set(null);
    this.editCommentDraft.set('');
  }

  saveEditComment(entry: BlogEntry, comment: BlogComment): void {
    const body = this.editCommentDraft().trim();
    if (!body) {
      this.commentError.set('Comment cannot be empty.');
      return;
    }
    this.commentError.set(null);
    this.blogsService
      .updateComment(entry.blogNumber, comment.id, body, {
        creatorNumber: comment.creatorNumber,
        nameTag: comment.nameTag,
      })
      .subscribe({
        next: (updated) => {
          this.replaceBlog(updated);
          this.cancelEditComment();
        },
        error: () => {
          this.commentError.set('Unable to edit comment. You can only edit your own.');
        },
      });
  }

  deleteComment(entry: BlogEntry, comment: BlogComment): void {
    this.commentMenuKey.set(null);
    this.commentError.set(null);
    this.blogsService
      .deleteComment(entry.blogNumber, comment.id, {
        creatorNumber: comment.creatorNumber,
        nameTag: comment.nameTag,
      })
      .subscribe({
        next: (updated) => this.replaceBlog(updated),
        error: () => {
          this.commentError.set('Unable to delete comment. You can only delete your own.');
        },
      });
  }

  verifyCommentShop(): void {
    const phone = this.commentShopPhone().trim();
    if (!phone) {
      this.commentError.set('Enter the shop phone number to verify.');
      return;
    }
    this.verifyingCommentShop.set(true);
    this.commentError.set(null);
    this.blogsService.verifyShopPhone(phone).subscribe({
      next: (shop) => {
        this.commentShopIdentity.set(shop);
        this.verifyingCommentShop.set(false);
      },
      error: () => {
        this.commentShopIdentity.set(null);
        this.verifyingCommentShop.set(false);
        this.commentError.set('No shop found for that phone number.');
      },
    });
  }

  verifyCreateShop(): void {
    const phone = this.createShopPhone().trim();
    if (!phone) {
      this.createBlogError.set('Enter the shop phone number to verify.');
      return;
    }
    this.verifyingCreateShop.set(true);
    this.createBlogError.set(null);
    this.blogsService.verifyShopPhone(phone).subscribe({
      next: (shop) => {
        this.createShopIdentity.set(shop);
        this.verifyingCreateShop.set(false);
      },
      error: () => {
        this.createShopIdentity.set(null);
        this.verifyingCreateShop.set(false);
        this.createBlogError.set('No shop found for that phone number.');
      },
    });
  }

  submitComment(entry: BlogEntry): void {
    const body = this.commentDraft(entry.blogNumber).trim();
    if (!body) {
      this.commentError.set('Write a comment first.');
      return;
    }

    const identity =
      this.commentAuthorKind() === 'shop'
        ? this.commentShopIdentity()
          ? this.blogsService.shopIdentityFromLookup(this.commentShopIdentity()!)
          : null
        : this.resolvePersonCommentIdentity();

    if (!identity) {
      this.commentError.set(
        this.commentAuthorKind() === 'shop'
          ? 'Verify a shop phone before commenting as a shop.'
          : 'Enter a name (or set it in your Junction profile) before commenting.',
      );
      return;
    }

    this.commentingBlogNumber.set(entry.blogNumber);
    this.commentError.set(null);

    this.blogsService
      .addComment(entry.blogNumber, {
        ...identity,
        body,
      })
      .subscribe({
        next: (updated) => {
          this.replaceBlog(updated);
          this.commentDrafts.update((drafts) => ({ ...drafts, [entry.blogNumber]: '' }));
          this.commentingBlogNumber.set(null);
        },
        error: () => {
          this.commentingBlogNumber.set(null);
          this.commentError.set('Unable to post comment. Try again.');
        },
      });
  }

  submitCreateBlog(): void {
    const junction = this.createJunction().trim();
    const body = this.createBody().trim();
    if (!junction) {
      this.createBlogError.set('Junction is required.');
      return;
    }
    if (!body) {
      this.createBlogError.set('Write a note first.');
      return;
    }

    const identity =
      this.createAuthorKind() === 'shop'
        ? this.createShopIdentity()
          ? this.blogsService.shopIdentityFromLookup(this.createShopIdentity()!)
          : null
        : this.resolvePersonCreateIdentity();

    if (!identity) {
      this.createBlogError.set(
        this.createAuthorKind() === 'shop'
          ? 'Verify a shop phone before creating as a shop.'
          : this.i18n.t('enquiry.nameRequired'),
      );
      return;
    }

    this.creatingBlog.set(true);
    this.createBlogError.set(null);
    this.blogsService
      .createEntry({
        junction,
        body,
        ...identity,
        tags: [identity.nameTag, junction],
      })
      .subscribe({
        next: (created) => {
          this.blogs.update((list) => [created, ...list.filter((item) => item.blogNumber !== created.blogNumber)]);
          this.createBody.set('');
          this.creatingBlog.set(false);
          this.selectedBlogNumber.set(created.blogNumber);
          this.closeCreateBlogSheet();
        },
        error: () => {
          this.creatingBlog.set(false);
          this.createBlogError.set(this.i18n.t('enquiry.createError'));
        },
      });
  }

  private resolvePersonCommentIdentity() {
    const profile = this.session.userProfile();
    const name = this.commentNameDraft().trim() || profile?.name?.trim() || '';
    if (!name) {
      return null;
    }
    const base = profile ? this.blogsService.personIdentityFromProfile({ ...profile, name }) : null;
    if (base) {
      return { ...base, creatorName: name };
    }
    const digits = (profile?.phoneNumber ?? '').replace(/\D/g, '');
    const creatorNumber = digits.slice(-4) || '0000';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'user';
    return {
      creatorName: name,
      creatorNumber,
      nameTag: `${slug}#${creatorNumber}`,
      authorKind: 'person' as const,
      shopId: null,
    };
  }

  private resolvePersonCreateIdentity() {
    const profile = this.session.userProfile();
    const name = this.createName().trim() || profile?.name?.trim() || '';
    if (!name) {
      return null;
    }
    const base = profile ? this.blogsService.personIdentityFromProfile({ ...profile, name }) : null;
    if (base) {
      return { ...base, creatorName: name };
    }
    const digits = (profile?.phoneNumber ?? '').replace(/\D/g, '');
    const creatorNumber = digits.slice(-4) || '0000';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'user';
    return {
      creatorName: name,
      creatorNumber,
      nameTag: `${slug}#${creatorNumber}`,
      authorKind: 'person' as const,
      shopId: null,
    };
  }

  private seedCreateForm(): void {
    const profile = this.session.userProfile();
    if (!profile) {
      return;
    }
    this.createJunction.set(this.blogsService.defaultJunction(profile, this.session.serviceScope()));
    this.createName.set(profile.name.trim());
    this.commentNameDraft.set(profile.name.trim());
    this.createShopPhone.set(profile.phoneNumber?.replace(/^\+91/, '') ?? '');
    this.commentShopPhone.set(profile.phoneNumber?.replace(/^\+91/, '') ?? '');
  }

  private replaceBlog(updated: BlogEntry): void {
    this.blogs.update((list) =>
      list.map((item) => (item.blogNumber === updated.blogNumber ? updated : item)),
    );
  }

  productImageRefs(product: Product): ProductImageRef[] {
    return resolveProductImageRefs(product);
  }

  productPrimaryImage(product: Product): ProductImageRef | null {
    return this.productImageRefs(product)[0] ?? null;
  }

  productImageSource(product: Product): string | null {
    return resolveProductImageSource(product);
  }

  openProductGallery(product: Product): void {
    if (this.productImageRefs(product).length === 0) {
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

  shopPhoneNumber(shop: Shop): string | null {
    if (!shop.show_phone) {
      return null;
    }

    const phone = shop.phone_number?.trim();
    return phone || null;
  }

  shopNotice(shop: Shop): string | null {
    const message = this.shopNotices()[shop.id]?.trim();
    return message || null;
  }

  private loadShops(): void {
    const profile = this.session.userProfile();
    if (!profile) {
      this.error.set('Choose your Junction first.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const shops$ =
      this.session.serviceScope() === 'city'
        ? this.catalog.getShopsByCity(profile.city.name)
        : this.catalog.getShops(profile.city.name, profile.locality.name);

    shops$.subscribe({
      next: (shops) => {
        const openShops = shops.filter((shop) => shop.is_open);
        this.shops.set(openShops);
        this.loading.set(false);
        this.loadShopNotices(openShops);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load services for your Junction.');
      },
    });
  }

  private loadBlogs(force: boolean): void {
    const profile = this.session.userProfile();
    const junctionKey = this.session.junctionKey();
    if (!profile || !junctionKey) {
      this.blogsError.set('Choose your Junction first.');
      return;
    }

    if (!force && this.loadedBlogJunctionKey === junctionKey) {
      return;
    }

    this.blogsLoading.set(true);
    this.blogsError.set(null);

    this.blogsService.listForJunction(profile, this.session.serviceScope()).subscribe({
      next: (entries) => {
        this.blogs.set(entries);
        this.loadedBlogJunctionKey = junctionKey;
        this.blogsLoading.set(false);
      },
      error: () => {
        this.blogsLoading.set(false);
        this.blogsError.set(this.i18n.t('enquiry.loadError'));
      },
    });
  }

  private loadShopNotices(shops: Shop[]): void {
    this.notices.getTodayForShops(shops.map((shop) => shop.id)).subscribe({
      next: (notices) => {
        const messages: Record<string, string> = {};
        for (const [storeId, notice] of Object.entries(notices)) {
          const message = notice.message?.trim();
          if (message) {
            messages[storeId] = message;
          }
        }
        this.shopNotices.set(messages);
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
