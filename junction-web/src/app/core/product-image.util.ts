import { Product } from '../models/product.model';
import { resolveApiBaseUrl } from './api.config';

const INTERNAL_IMAGE_ID_PATTERN = /\/products\/images\/([a-fA-F0-9]{24})(?:\?.*)?$/;

function normalizeImageKey(value: string): string {
  const trimmed = value.trim();
  const match = INTERNAL_IMAGE_ID_PATTERN.exec(trimmed);
  if (match) {
    return `stored:${match[1]}`;
  }
  return trimmed;
}

export function resolveProductImageSource(product: Product): string | null {
  const sources = resolveProductImageSources(product);
  return sources[0] ?? null;
}

export function resolveProductImageSources(product: Product): string[] {
  const sources: string[] = [];
  const seenKeys = new Set<string>();
  const seenUrls = new Set<string>();

  const add = (value: string | null | undefined): void => {
    if (!value?.trim()) {
      return;
    }

    const normalized = value.trim();
    const key = normalizeImageKey(normalized);
    if (seenKeys.has(key) || seenUrls.has(normalized)) {
      return;
    }

    seenKeys.add(key);
    seenUrls.add(normalized);
    sources.push(normalized);
  };

  const heroStoredId = product.image?.stored_image_id ?? product.images?.[0]?.stored_image_id;
  if (heroStoredId) {
    add(`/products/images/${heroStoredId}`);
  }

  add(product.image_cdn);
  add(product.image_url);
  add(product.image?.cdn);

  for (const image of product.images ?? []) {
    if (image.stored_image_id) {
      add(`/products/images/${image.stored_image_id}`);
    }
    add(image.cdn);
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
