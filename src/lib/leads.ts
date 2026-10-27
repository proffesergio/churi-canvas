import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { Store, Lead } from './model';
import type { leadSchema, checkoutSchema } from './validation';
import { HttpError, placeOrder } from './orders';

export function collectLead(store: Store, input: z.infer<typeof leadSchema>): Lead {
  const existing = store.leads.find(l => l.submissionKey === input.submissionKey);
  if (existing) return existing;
  const now = new Date().toISOString();
  const lead: Lead = { id: randomUUID(), source: input.source, name: input.name,
    phone: input.phone, message: input.message, submissionKey: input.submissionKey,
    notes: '', status: 'New', createdAt: now, updatedAt: now };
  store.leads.unshift(lead);
  return lead;
}
export function convertLead(store: Store, id: string, input: z.infer<typeof checkoutSchema>) {
  const lead = store.leads.find(l => l.id === id);
  if (!lead) throw new HttpError(404, 'Lead not found.');
  if (lead.orderId) {
    const order = store.orders.find(o => o.id === lead.orderId);
    if (!order) throw new HttpError(409, 'Linked order is unavailable.');
    return order;
  }
  if (lead.status === 'Lost') throw new HttpError(409, 'Reopen this lead before creating an order.');
  const order = placeOrder(store, { ...input, idempotencyKey: lead.id }, 'lead:' + lead.id, lead.source);
  order.source = lead.source;
  order.leadId = lead.id;
  lead.status = 'Converted';
  lead.orderId = order.id;
  lead.updatedAt = new Date().toISOString();
  return order;
}
