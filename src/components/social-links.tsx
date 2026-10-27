'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Facebook, Video } from 'lucide-react';
import { api } from '@/lib/api';
import type { PublicSocial } from '@/lib/model';

export function SocialLinks() {
  const { data } = useQuery({
    queryKey: ['public-social'],
    queryFn: () => api<PublicSocial>('social'),
    staleTime: 60000,
    retry: false,
  });

  const facebook = data === undefined ? { url: 'https://www.facebook.com/bdchuricanvas', followers: null } : data.facebook;
  return (
    <div className="social-links">
      {facebook && (
        <a href={facebook.url} target="_blank" rel="noreferrer">
          <Facebook size={15} />
          <span>Follow on Facebook</span>
          {facebook.followers !== null && (
            <small>
              {facebook.followers.toLocaleString('en-US')} followers
            </small>
          )}
          <ArrowUpRight size={13} />
        </a>
      )}
      {data?.tiktok && (
        <a href={data?.tiktok.url} target="_blank" rel="noreferrer">
          <Video size={15} />
          <span>Follow on TikTok</span>
          {data?.tiktok.followers !== null && (
            <small>
              {data?.tiktok.followers.toLocaleString('en-US')} followers
            </small>
          )}
          <ArrowUpRight size={13} />
        </a>
      )}
      {!data?.tiktok && <span><Video size={15} /> TikTok · Coming soon</span>}
      <a href="https://m.me/bdchuricanvas" target="_blank" rel="noreferrer">Message us on Facebook <ArrowUpRight size={13} /></a>
      <Link href="/enquire?source=facebook">Ask about a piece</Link>
    </div>
  );
}
