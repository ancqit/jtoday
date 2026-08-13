import { Shop } from '../models/shop.model';
import { isExternalImageUrl, toAbsoluteApiUrl } from './product-image.util';

export function resolveShopProfileImageSource(shop: Shop): string | null {
  const url = shop.profile_image_url?.trim();
  if (!url) {
    return null;
  }

  if (isExternalImageUrl(url)) {
    return url;
  }

  return toAbsoluteApiUrl(url);
}
