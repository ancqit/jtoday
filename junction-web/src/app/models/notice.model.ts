/** junctionBack `Notice` from GET /notices (public, junction-agnostic). */
export interface Notice {
  id: string;
  store_id: string;
  message: string;
  notice_date: string;
  created_at: string;
  updated_at: string;
  /** Shop display name from catalog (optional until backend ships enrichment). */
  shop_name?: string | null;
  city?: string | null;
  locality?: string | null;
}
