import { Product } from '../models/product.model';
import { resolveApiBaseUrl } from './api.config';

const INTERNAL_IMAGE_ID_PATTERN = /\/products\/images\/([a-fA-F0-9]{24})(?:\?.*)?$/;

export type ProductImageKind = 'cdn' | 'stored';

/** One displayable product image with an explicit render source. */
export interface ProductImageRef {
  kind: ProductImageKind;
  src: string;
  storedId?: string;
}

function storedIdFromPath(value: string): string | null {
  const match = INTERNAL_IMAGE_ID_PATTERN.exec(value.trim());
  return match?.[1] ?? null;
}

/**
 * Prefer a single source per image: CDN when present, otherwise the stored blob path.
 * This prevents the duplicate gallery bug (same photo as CDN URL + /products/images/{id}).
 */
export function resolveProductImageRefs(product: Product): ProductImageRef[] {
  const refs: ProductImageRef[] = [];
  const coveredStoredIds = new Set<string>();
  const seenCdn = new Set<string>();

  const pushCdn = (url: string | null | undefined, storedId?: string | null): void => {
    const src = url?.trim();
    if (!src || seenCdn.has(src)) {
      return;
    }
    seenCdn.add(src);
    if (storedId) {
      coveredStoredIds.add(storedId);
    }
    refs.push({ kind: 'cdn', src, storedId: storedId ?? undefined });
  };

  const pushStored = (storedId: string | null | undefined): void => {
    const id = storedId?.trim();
    if (!id || coveredStoredIds.has(id)) {
      return;
    }
    coveredStoredIds.add(id);
    refs.push({ kind: 'stored', src: `/products/images/${id}`, storedId: id });
  };

  const consider = (image?: {
    cdn?: string | null;
    stored_image_id?: string | null;
  } | null): void => {
    if (!image) {
      return;
    }
    if (image.cdn?.trim()) {
      pushCdn(image.cdn, image.stored_image_id);
      return;
    }
    pushStored(image.stored_image_id);
  };

  consider(product.image);
  for (const image of product.images ?? []) {
    consider(image);
  }

  // Legacy single-field CDN URLs (no stored twin).
  pushCdn(product.image_cdn);
  pushCdn(product.image_url);

  // Legacy absolute stored paths that were never paired with a CDN entry.
  for (const legacy of [product.image_url, product.image_cdn]) {
    const id = legacy ? storedIdFromPath(legacy) : null;
    if (id) {
      pushStored(id);
    }
  }

  return refs;
}

export function resolveProductImageSource(product: Product): string | null {
  return resolveProductImageRefs(product)[0]?.src ?? null;
}

/** @deprecated Prefer resolveProductImageRefs for kind-aware rendering. */
export function resolveProductImageSources(product: Product): string[] {
  return resolveProductImageRefs(product).map((ref) => ref.src);
}

export function isExternalImageUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export function toAbsoluteApiUrl(path: string): string {
  const base = resolveApiBaseUrl().replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
