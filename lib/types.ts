export type Category = {
  slug: string;
  title: string;
  emoji: string;
  tint: string;
  parent?: string;
};

export type Listing = {
  id: string;
  title: string;
  price: string;
  city: string;
  category: string;
  path: string[];
  emoji: string;
  tint: string;
  desc: string;
  createdAt: number;
};
