/** junctionBack `Notice` from GET /notices/today?store_id= */
export interface Notice {
  id: string;
  store_id: string;
  message: string;
  notice_date: string;
  created_at: string;
  updated_at: string;
}
