import { Product } from '../models/product.model';
import { resolveApiBaseUrl } from './api.config';

export function resolveProductImageSource(product: Product): string | null {
  const candidates = [
    product.image_cdn,
    product.image_url,
    product.image?.cdn,
    product.images?.[0]?.cdn,
  ];

  for (const candidate of candidates) {
    if (candidate?.trim()) {
      return candidate.trim();
    }
  }

  const storedId = product.image?.stored_image_id ?? product.images?.[0]?.stored_image_id;
  if (storedId) {
    return `/products/images/${storedId}`;
  }

  return null;
}

export function isExternalImageUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export function toAbsoluteApiUrl(path: string): string {
  const base = resolveApiBaseUrl().replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
