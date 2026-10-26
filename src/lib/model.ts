export const sizes = ['2.4', '2.6', '2.8'] as const;
export const statuses = [
  'Pending',
  'Processing',
  'In Transit',
  'Delivered',
] as const;
export const categories = [
  'All pieces',
  'Everyday',
  'Festive',
  'Bridal',
] as const;
export type Product = {
  id: string;
  revision: number;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: Record<string, number>;
  visible: boolean;
  badge: string;
  createdAt: string;
};
export type CartLine = {
  productId: string;
  size: string;
  quantity: number;
  notes: string;
};
export type OrderItem = CartLine & {
  title: string;
  price: number;
  image: string;
};
export type Order = {
  id: string;
  token: string;
  customerId: string;
  name: string;
  phone: string;
  address: string;
  zone: 'Inside Dhaka' | 'Outside Dhaka';
  payment: 'COD' | 'bKash' | 'Nagad';
  paymentReference: string;
  paymentStatus: 'Due on delivery' | 'Mock payment';
  items: OrderItem[];
  subtotal: number;
  delivery: number;
  total: number;
  status: (typeof statuses)[number];
  history: { status: string; at: string }[];
  createdAt: string;
  idempotencyKey: string;
};
export type PixelEvent = {
  id: string;
  type: 'PageView' | 'AddToCart' | 'Purchase';
  at: string;
  value: number;
  source: 'Storefront' | 'Facebook' | 'TikTok';
};
export type SocialState = {
  facebook: { syncedAt: string | null; count: number };
  tiktok: { syncedAt: string | null; count: number };
  messages: {
    id: string;
    name: string;
    text: string;
    at: string;
    source: string;
  }[];
};
export type Store = {
  products: Product[];
  orders: Order[];
  events: PixelEvent[];
  social: SocialState;
  loginAttempts: Record<string, { count: number; reset: number }>;
};
export const money = (amount: number) => '৳' + amount.toLocaleString('en-BD');
export const deliveryFee = (zone: string) =>
  zone === 'Inside Dhaka' ? 70 : 130;
export function initialStore(): Store {
  const names = [
    'Shurjomukhi Floral Pair',
    'Rangdhonu Silk Set',
    'Trio of Traditions',
    'Golden Hour Pair',
    'Mehendi Mirror Set',
    'A Touch of Tradition',
    'Laal Golap Set',
    'The Festive Edit',
    'Everyday Elegance',
  ];
  return {
    products: names.map((title, i) => ({
      id: 'churi-' + (i + 1),
      revision: 1,
      title,
      description:
        'Hand-wrapped with care, finished with traditional detailing. A little piece of home, made for your everyday celebrations. Each set is handmade, so small variations make it uniquely yours.',
      price: [220, 280, 200, 240, 250, 300, 350, 320, 180][i],
      category: i === 6 ? 'Bridal' : i % 3 === 0 ? 'Everyday' : 'Festive',
      images: ['/products/' + (i + 1) + '.jpeg'],
      stock: { '2.4': 8, '2.6': 12, '2.8': 6 },
      visible: true,
      badge:
        i === 6
          ? 'Bestseller'
          : i === 4
            ? 'New arrival'
            : i === 2
              ? 'Made with love'
              : '',
      createdAt: new Date(2026, 9, 25 - i).toISOString(),
    })),
    orders: [],
    events: [],
    social: {
      facebook: { syncedAt: null, count: 0 },
      tiktok: { syncedAt: null, count: 0 },
      messages: [],
    },
    loginAttempts: {},
  };
}
