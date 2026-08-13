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

export function resolveProductImageSources(product: Product): string[] {
  const sources: string[] = [];
  const seen = new Set<string>();

  const add = (value: string | null | undefined): void => {
    if (!value?.trim()) {
      return;
    }

    const normalized = value.trim();
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    sources.push(normalized);
  };

  add(product.image_cdn);
  add(product.image_url);
  add(product.image?.cdn);

  const primaryStoredId = product.image?.stored_image_id;
  if (primaryStoredId) {
    add(`/products/images/${primaryStoredId}`);
  }

  for (const image of product.images ?? []) {
    add(image.cdn);
    if (image.stored_image_id) {
      add(`/products/images/${image.stored_image_id}`);
    }
  }

  return sources;
}

export function isExternalImageUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export function toAbsoluteApiUrl(path: string): string {
  const base = resolveApiBaseUrl().replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
