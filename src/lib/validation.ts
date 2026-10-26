import { z } from 'zod';
import { sizes, statuses } from './model';
export const productSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1500),
  price: z.number().int().min(1).max(100000),
  category: z.enum(['Everyday', 'Festive', 'Bridal']),
  images: z
    .array(
      z
        .string()
        .max(700000)
        .refine(
          (v) =>
            /^\/products\/[1-9]\.jpeg$/.test(v) ||
            /^\/api\/assets\/products\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/.test(
              v,
            ) ||
            /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
          'Use a supplied photo or a JPEG, PNG, or WebP upload',
        ),
    )
    .min(1)
    .max(5),
  stock: z.object({
    '2.4': z.number().int().min(0).max(10000),
    '2.6': z.number().int().min(0).max(10000),
    '2.8': z.number().int().min(0).max(10000),
  }),
  visible: z.boolean(),
  badge: z.string().trim().max(30),
});
export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, '').replace(/^\+88/, ''))
      .pipe(
        z
          .string()
          .regex(/^01[3-9]\d{8}$/, 'Enter a valid Bangladeshi mobile number'),
      ),
    address: z.string().trim().min(10).max(400),
    zone: z.enum(['Inside Dhaka', 'Outside Dhaka']),
    payment: z.enum(['COD', 'bKash', 'Nagad']),
    paymentReference: z.string().trim().max(40).default(''),
    items: z
      .array(
        z.object({
          productId: z.string().max(80),
          size: z.enum(sizes),
          quantity: z.number().int().min(1).max(10),
          notes: z.string().trim().max(300),
        }),
      )
      .min(1)
      .max(30),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((v, ctx) => {
    if (v.payment !== 'COD' && !/^[a-zA-Z0-9]{6,40}$/.test(v.paymentReference))
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a mock transaction reference (6–40 letters or numbers)',
        path: ['paymentReference'],
      });
  });
export const statusSchema = z.object({ status: z.enum(statuses) });
