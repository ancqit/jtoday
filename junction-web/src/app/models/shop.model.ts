export interface Shop {
  id: string;
  name: string;
  city: string;
  locality: string;
  open_time?: string | null;
  closed_time?: string | null;
  is_open: boolean;
  phone_number?: string | null;
  /** When false, hide phone_number in the UI (junctionBack shop switch). */
  show_phone?: boolean;
  owner_user_id: string;
  /** Owner profile photo from junctionBack GET /profile/avatar/file/{id} */
  avatar_url?: string | null;
  /** @deprecated Use avatar_url from junctionBack shop catalog */
  profile_image_url?: string | null;
  shop_type?: string | null;
  shop_type_label?: string | null;
  owner_bio?: string | null;
  /** Owner DigiLocker / gov-ID verification from junctionBack shop catalog. */
  digilocker_verified?: boolean | null;
  /** Owner GSTIN verification from junctionBack shop catalog. */
  gst_verified?: boolean | null;
}
