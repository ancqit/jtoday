export type BlogAuthorKind = 'person' | 'shop';

export interface BlogComment {
  id: string;
  body: string;
  creatorName: string;
  creatorNumber: string;
  nameTag: string;
  createdAt: string;
  authorKind?: BlogAuthorKind;
  shopId?: string | null;
}

export interface BlogEntry {
  id: string;
  blogNumber: number;
  junction: string;
  body: string;
  creatorName: string;
  creatorNumber: string;
  nameTag: string;
  tags: string[];
  authorKind?: BlogAuthorKind;
  shopId?: string | null;
  comments: BlogComment[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogShopIdentity {
  shop_id: string;
  shop_name: string;
  phone_number: string;
  city?: string | null;
  locality?: string | null;
  creator_name: string;
  creator_number: string;
  name_tag: string;
}
