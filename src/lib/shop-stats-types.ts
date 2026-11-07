export type ShopStatsPeriod = "day" | "week" | "month";

export type ShopItemStats = {
  id: string;
  title: string;
  views: number;
  sold: number;
  quantity: number | null;
  revenueSom: number;
  stockValueSom: number | null;
  low: boolean;
};

export type ShopStatsCard = {
  id: string;
  name: string;
  views: number;
  itemViews: number;
  calls: number;
  whatsapp: number;
  chats: number;
  subscribers: number;
  likes: number;
  orders: number;
  ordersSom: number;
  stockValueSom: number;
  replyMinutes: number | null;
  refused: number;
  ordersOpened: number;
  items: ShopItemStats[];
};
