export type ProductImageSource = 'cdn' | 'query' | 'upload' | 'pexels' | 'gemini';

export interface ProductImage {
  source: ProductImageSource;
  cdn?: string | null;
  stored_image_id?: string | null;
  content_type?: string | null;
  filename?: string | null;
}
