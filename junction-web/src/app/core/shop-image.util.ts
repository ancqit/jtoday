import { Shop } from '../models/shop.model';
import { isExternalImageUrl, toAbsoluteApiUrl } from './product-image.util';

/** junctionBack public profile photo route (no JWT required). */
export function isPublicProfileAvatarPath(url: string): boolean {
  return url.includes('/profile/avatar/file/');
}

export function resolveShopProfileImageSource(shop: Shop): string | null {
  const candidates = [shop.avatar_url, shop.profile_image_url];

  for (const candidate of candidates) {
    const url = candidate?.trim();
    if (!url) {
      continue;
    }

    if (isExternalImageUrl(url)) {
      return url;
    }

    return toAbsoluteApiUrl(url);
  }

  return null;
}
