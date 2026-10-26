import { NextResponse } from 'next/server';
import {
  isAssetKey,
  readProductAsset,
  storageConfigured,
} from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const key = (await params).key.join('/');
  if (!isAssetKey(key)) return new NextResponse('Not found', { status: 404 });
  if (!storageConfigured)
    return new NextResponse('Object storage is unavailable', { status: 503 });
  try {
    const file = await readProductAsset(key);
    return new NextResponse(await file.blob(), {
      headers: {
        'Content-Type': file.contentType,
        'Content-Length': String(file.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
