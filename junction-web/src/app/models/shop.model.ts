export interface Shop {
  id: string;
  name: string;
  city: string;
  locality: string;
  open_time?: string | null;
  closed_time?: string | null;
  is_open: boolean;
  phone_number: string;
  owner_user_id: string;
  /** Owner profile photo from junctionBack GET /profile/avatar/file/{id} */
  avatar_url?: string | null;
  /** @deprecated Use avatar_url from junctionBack shop catalog */
  profile_image_url?: string | null;
}
