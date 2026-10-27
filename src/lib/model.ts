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
  source?: 'Storefront' | 'Facebook' | 'TikTok';
  leadId?: string;
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
export type SocialPost = {
  id: string;
  message: string;
  image: string | null;
  url: string;
  createdAt: string;
};
export type SocialVideo = {
  id: string;
  title: string;
  cover: string | null;
  url: string;
  createdAt: string;
  views: number;
  likes: number;
};
export type SocialMessage = {
  id: string;
  name: string;
  text: string;
  at: string;
  source: string;
};
export type SocialStatus = 'disconnected' | 'connected' | 'error';
export type SocialConnection = {
  enabled: boolean;
  accountId: string;
  accountName: string;
  url: string;
  token: string;
  status: SocialStatus;
  followers: number | null;
  verifiedAt: string | null;
  error: string | null;
};
export type FacebookState = SocialConnection & {
  syncedAt: string | null;
  count: number;
  posts: SocialPost[];
};
export type TikTokState = SocialConnection & {
  syncedAt: string | null;
  count: number;
  videos: SocialVideo[];
};
export type SocialState = {
  facebook: FacebookState;
  tiktok: TikTokState;
  messages: SocialMessage[];
};
export type SocialConnectionView = Omit<SocialConnection, 'token'> & {
  hasToken: boolean;
  tokenHint: string;
};
export type FacebookView = SocialConnectionView & {
  syncedAt: string | null;
  count: number;
  posts: SocialPost[];
};
export type TikTokView = SocialConnectionView & {
  syncedAt: string | null;
  count: number;
  videos: SocialVideo[];
};
export type SocialView = {
  facebook: FacebookView;
  tiktok: TikTokView;
  messages: SocialMessage[];
};
export type PublicSocial = {
  facebook: { name: string; url: string; followers: number | null } | null;
  tiktok: { name: string; url: string; followers: number | null } | null;
};
export const leadStatuses = ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'] as const;
export type Lead = {
  id: string;
  source: 'Facebook' | 'TikTok';
  name: string;
  phone: string;
  message: string;
  notes: string;
  status: (typeof leadStatuses)[number];
  createdAt: string;
  updatedAt: string;
  orderId?: string;
  submissionKey: string;
};
export type Store = {
  leads: Lead[];
  products: Product[];
  orders: Order[];
  events: PixelEvent[];
  social: SocialState;
  loginAttempts: Record<string, { count: number; reset: number }>;
};
export const money = (amount: number) => '৳' + amount.toLocaleString('en-BD');
export const deliveryFee = (zone: string) =>
  zone === 'Inside Dhaka' ? 70 : 130;
export function initialSocial(): SocialState {
  return {
    facebook: {
      enabled: true,
      accountId: '',
      accountName: 'ChuriCanvas',
      url: 'https://www.facebook.com/bdchuricanvas',
      token: '',
      status: 'disconnected',
      followers: null,
      verifiedAt: null,
      error: null,
      syncedAt: null,
      count: 0,
      posts: [],
    },
    tiktok: {
      enabled: false,
      accountId: '',
      accountName: '',
      url: '',
      token: '',
      status: 'disconnected',
      followers: null,
      verifiedAt: null,
      error: null,
      syncedAt: null,
      count: 0,
      videos: [],
    },
    messages: [],
  };
}
export function normalizeStore(store: Store): Store {
  const defaults = initialSocial();
  const social = store.social || defaults;
  const facebook = { ...defaults.facebook, ...(social.facebook || {}) };
  if (!facebook.url && !facebook.accountId) Object.assign(facebook, { url: defaults.facebook.url, accountName: 'ChuriCanvas', enabled: true });
  const tiktok = { ...defaults.tiktok, ...(social.tiktok || {}) };
  return {
    ...store,
    leads: Array.isArray(store.leads) ? store.leads : [],
    social: {
      facebook: {
        ...facebook,
        posts: Array.isArray(facebook.posts) ? facebook.posts : [],
      },
      tiktok: {
        ...tiktok,
        videos: Array.isArray(tiktok.videos) ? tiktok.videos : [],
      },
      messages: Array.isArray(social.messages) ? social.messages : [],
    },
  };
}
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
    leads: [],
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
    social: initialSocial(),
    loginAttempts: {},
  };
}
