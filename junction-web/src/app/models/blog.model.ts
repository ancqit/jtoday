export interface BlogComment {
  id: string;
  body: string;
  creatorName: string;
  creatorNumber: string;
  nameTag: string;
  createdAt: string;
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
  comments: BlogComment[];
  createdAt: string;
  updatedAt: string;
}
