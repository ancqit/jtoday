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
  description?: string | null;
  mobile_number?: string | null;
  show_mobile_number?: boolean;
  profile_image_url?: string | null;
}
