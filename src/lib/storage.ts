import 'server-only';
import { randomUUID } from 'node:crypto';
import { Files } from 'files-sdk';
import { neon } from 'files-sdk/neon';

export const storageBucket = process.env.NEON_STORAGE_BUCKET || 'assets';

export const storageConfigured = Boolean(
  process.env.AWS_ENDPOINT_URL_S3 &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY,
);

type StorageGlobals = { churicanvasStorage?: Files };

const globals = globalThis as typeof globalThis & StorageGlobals;

export function storage() {
  if (!storageConfigured)
    throw new Error(
      'Object storage is not configured. Run `neon deploy` and restart the app.',
    );
  globals.churicanvasStorage ??= new Files({
    adapter: neon({ bucket: storageBucket }),
  });
  return globals.churicanvasStorage;
}

const imageTypes = {
  'image/jpeg': { extension: 'jpg', signature: [0xff, 0xd8, 0xff] },
  'image/png': { extension: 'png', signature: [0x89, 0x50, 0x4e, 0x47] },
  'image/webp': { extension: 'webp', signature: [0x52, 0x49, 0x46, 0x46] },
} as const;

export function isStoredAsset(value: string) {
  return /^\/api\/assets\/products\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/.test(
    value,
  );
}

export function isAssetKey(value: string) {
  return /^products\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/.test(value);
}

export async function persistProductImages(images: string[]) {
  return Promise.all(
    images.map(async (image) => {
      if (!image.startsWith('data:')) return image;
      const match =
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
          image,
        );
      if (!match) throw new Error('Unsupported uploaded photo.');
      const contentType = match[1] as keyof typeof imageTypes;
      const type = imageTypes[contentType];
      const bytes = Buffer.from(match[2], 'base64');
      if (bytes.byteLength > 700_000)
        throw new Error('This photo is too detailed. Choose a smaller image.');
      if (!type.signature.every((byte, index) => bytes[index] === byte))
        throw new Error('The uploaded photo does not match its file type.');
      if (
        !storageConfigured &&
        !process.env.DATABASE_URL &&
        !process.env.VERCEL
      )
        return image;
      const key = `products/${randomUUID()}.${type.extension}`;
      await storage().upload(key, bytes, {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      });
      return `/api/assets/${key}`;
    }),
  );
}

export async function readProductAsset(key: string) {
  if (!isAssetKey(key)) throw new Error('Unknown asset.');
  return storage().download(key);
}
