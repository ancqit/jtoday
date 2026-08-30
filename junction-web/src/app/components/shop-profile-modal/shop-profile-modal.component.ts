import { Component, input, output } from '@angular/core';
import { AuthorizedImageComponent } from '../authorized-image/authorized-image.component';
import { Shop } from '../../models/shop.model';
import { formatShopHours } from '../../core/shop-hours.util';
import { resolveShopProfileImageSource } from '../../core/shop-image.util';

@Component({
  selector: 'app-shop-profile-modal',
  imports: [AuthorizedImageComponent],
  templateUrl: './shop-profile-modal.component.html',
  styleUrl: './shop-profile-modal.component.scss',
})
export class ShopProfileModalComponent {
  readonly shop = input.required<Shop>();
  readonly notice = input<string | null>(null);
  readonly closed = output<void>();

  imageSource(shop: Shop): string | null {
    return resolveShopProfileImageSource(shop);
  }

  hoursLabel(shop: Shop): string | null {
    if (!shop.open_time || !shop.closed_time) {
      return null;
    }
    return formatShopHours(shop.open_time, shop.closed_time);
  }

  phoneNumber(shop: Shop): string | null {
    if (!shop.show_phone) {
      return null;
    }
    const phone = shop.phone_number?.trim();
    return phone || null;
  }

  onDismiss(): void {
    this.closed.emit();
  }
}
