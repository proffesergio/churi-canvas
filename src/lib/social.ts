import 'server-only';
import type {
  PublicSocial,
  SocialConnection,
  SocialConnectionView,
  SocialPost,
  SocialState,
  SocialVideo,
  SocialView,
} from './model';
import { decryptSecret } from './secrets';

const facebookApi = 'https://graph.facebook.com/v23.0';
const tiktokApi = 'https://open.tiktokapis.com/v2';

type ExternalError = {
  error?: {
    code?: string | number;
    message?: string;
    error_user_msg?: string;
  };
  message?: string;
};

type FacebookPage = {
  id: string;
  name: string;
  link?: string;
  fan_count?: number;
  followers_count?: number;
};

type FacebookPost = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
};

type TikTokUser = {
  open_id: string;
  display_name?: string;
  follower_count?: number;
};

type TikTokVideo = {
  id: string;
  title?: string;
  cover_image_url?: string;
  share_url?: string;
  create_time?: number;
  view_count?: number;
  like_count?: number;
};

function environmentToken(platform: 'facebook' | 'tiktok') {
  return platform === 'facebook'
    ? process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''
    : process.env.TIKTOK_ACCESS_TOKEN || '';
}

export function resolveToken(
  connection: SocialConnection,
  platform: 'facebook' | 'tiktok',
) {
  let stored = '';
  if (connection.token) {
    try {
      stored = decryptSecret(connection.token);
    } catch {
      stored = '';
    }
  }
  return stored || environmentToken(platform);
}

function connectionView(
  connection: SocialConnection,
  platform: 'facebook' | 'tiktok',
): SocialConnectionView {
  const token = resolveToken(connection, platform);
  return {
    enabled: connection.enabled,
    accountId: connection.accountId,
    accountName: connection.accountName,
    url: connection.url,
    status: connection.status,
    followers: connection.followers,
    verifiedAt: connection.verifiedAt,
    error: connection.error,
    hasToken: Boolean(token),
    tokenHint: token ? '••••' + token.slice(-4) : '',
  };
}

export function socialView(social: SocialState): SocialView {
  return {
    facebook: {
      ...connectionView(social.facebook, 'facebook'),
      syncedAt: social.facebook.syncedAt,
      count: social.facebook.count,
      posts: social.facebook.posts,
    },
    tiktok: {
      ...connectionView(social.tiktok, 'tiktok'),
      syncedAt: social.tiktok.syncedAt,
      count: social.tiktok.count,
      videos: social.tiktok.videos,
    },
    messages: social.messages,
  };
}

export function publicSocial(social: SocialState): PublicSocial {
  const facebookUrl =
    social.facebook.url ||
    (social.facebook.accountId
      ? `https://www.facebook.com/${encodeURIComponent(social.facebook.accountId)}`
      : '');
  const tiktokUsername = social.tiktok.accountId.replace(/^@/, '').trim();
  const tiktokUrl =
    social.tiktok.url ||
    (tiktokUsername && !/^\d+$/.test(tiktokUsername)
      ? `https://www.tiktok.com/@${encodeURIComponent(tiktokUsername)}`
      : '');
  return {
    facebook:
      social.facebook.enabled && facebookUrl
        ? {
            name: social.facebook.accountName || 'Facebook',
            url: facebookUrl,
            followers: social.facebook.followers,
          }
        : null,
    tiktok:
      social.tiktok.enabled && tiktokUrl
        ? {
            name: social.tiktok.accountName || 'TikTok',
            url: tiktokUrl,
            followers: social.tiktok.followers,
          }
        : null,
  };
}

async function external<T>(
  url: string,
  init: RequestInit,
  platform: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
  } catch {
    throw new Error(
      `Could not reach ${platform}. Check the connection and try again.`,
    );
  }
  const payload = (await response.json().catch(() => null)) as
    | (T & ExternalError)
    | null;
  const failure = payload?.error;
  if (
    !response.ok ||
    (failure?.code !== undefined &&
      failure.code !== 'ok' &&
      failure.code !== 0)
  ) {
    const message =
      failure?.error_user_msg ||
      failure?.message ||
      payload?.message ||
      `${platform} returned status ${response.status}.`;
    throw new Error(String(message).slice(0, 300));
  }
  if (!payload)
    throw new Error(`${platform} returned an unreadable response.`);
  return payload;
}

export async function verifyFacebookPage(input: {
  accountId: string;
  token: string;
}) {
  const params = new URLSearchParams({
    fields: 'id,name,link,fan_count,followers_count',
  });
  const page = await external<FacebookPage>(
    `${facebookApi}/${encodeURIComponent(input.accountId || 'me')}?${params}`,
    { headers: { Authorization: `Bearer ${input.token}` } },
    'Facebook',
  );
  if (!page.id || !page.name)
    throw new Error('Facebook did not return a Page for this token.');
  return {
    accountId: page.id,
    accountName: page.name,
    url: page.link || `https://www.facebook.com/${page.id}`,
    followers: page.followers_count ?? page.fan_count ?? null,
  };
}

export async function fetchFacebookPosts(
  pageId: string,
  token: string,
): Promise<SocialPost[]> {
  const params = new URLSearchParams({
    fields: 'id,message,created_time,permalink_url,full_picture',
    limit: '6',
  });
  const result = await external<{ data?: FacebookPost[] }>(
    `${facebookApi}/${encodeURIComponent(pageId)}/posts?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
    'Facebook',
  );
  return (result.data || []).map((post) => ({
    id: post.id,
    message: post.message || '',
    image: post.full_picture || null,
    url: post.permalink_url || `https://www.facebook.com/${post.id}`,
    createdAt: post.created_time || new Date().toISOString(),
  }));
}

async function tiktokRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
) {
  const payload = await external<{ data?: T }>(
    `${tiktokApi}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    },
    'TikTok',
  );
  if (!payload.data)
    throw new Error('TikTok did not return any account data.');
  return payload.data;
}

export async function verifyTikTokProfile(input: {
  accountId: string;
  url: string;
  token: string;
}) {
  const data = await tiktokRequest<{ user?: TikTokUser }>(
    '/user/info/?fields=open_id,display_name,follower_count',
    input.token,
  );
  const user = data.user;
  if (!user?.open_id)
    throw new Error('TikTok did not return a profile for this token.');
  const username = input.accountId.replace(/^@/, '').trim();
  return {
    accountId: input.accountId || user.open_id,
    accountName: user.display_name || username || 'TikTok profile',
    url:
      input.url ||
      (username && !/^\d+$/.test(username)
        ? `https://www.tiktok.com/@${encodeURIComponent(username)}`
        : 'https://www.tiktok.com/'),
    followers: user.follower_count ?? null,
  };
}

export async function fetchTikTokVideos(token: string): Promise<SocialVideo[]> {
  const data = await tiktokRequest<{ videos?: TikTokVideo[] }>(
    '/video/list/?fields=id,title,cover_image_url,share_url,create_time,view_count,like_count',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_count: 6 }),
    },
  );
  return (data.videos || []).map((video) => ({
    id: video.id,
    title: video.title || 'TikTok video',
    cover: video.cover_image_url || null,
    url: video.share_url || '',
    createdAt: video.create_time
      ? new Date(video.create_time * 1000).toISOString()
      : new Date().toISOString(),
    views: video.view_count ?? 0,
    likes: video.like_count ?? 0,
  }));
}
