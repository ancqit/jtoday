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
}
