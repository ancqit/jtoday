/** junctionBack GET /session/shops and GET /session/shops/{shop_id} */
export interface SessionShopContact {
  id: string;
  name: string;
  phone_number: string | null;
  show_phone: boolean;
}
