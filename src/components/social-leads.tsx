 'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { leadStatuses, money, sizes, type Lead, type Product } from '@/lib/model';
import { Sheet } from './sheet';
import { LeadForm } from './lead-form';
import { useToast } from './providers';

export function SocialLeads({ leads, products, onOrder }: { leads: Lead[]; products: Product[]; onOrder: (id: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [source, setSource] = useState('All platforms');
  const [status, setStatus] = useState('All statuses');
  const [search, setSearch] = useState('');
  const client = useQueryClient();
  const toast = useToast();
  const lead = leads.find(l => l.id === selected);
  const filtered = leads.filter(l => (source === 'All platforms' || l.source === source) && (status === 'All statuses' || l.status === status) && (l.name + ' ' + l.phone + ' ' + l.message).toLowerCase().includes(search.toLowerCase()));
  async function refresh() { await client.invalidateQueries({ queryKey: ['admin-overview'] }); await client.invalidateQueries({ queryKey: ['products'] }); }
  return <section className="admin-panel">
    <div className="panel-heading"><div><h2>Social leads & orders</h2><p>{leads.filter(l => l.status === 'New').length} new · {leads.filter(l => l.status === 'Converted').length} converted</p></div><button className="primary" onClick={() => setAdding(true)}>Add lead</button></div>
    <p>Collect enquiries from your profile links or record conversations manually. Automatic inbox and ad-lead imports are not connected.</p>
    <div className="social-actions">{(['facebook', 'tiktok'] as const).map(platform => <button key={platform} className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(window.location.origin + '/enquire?source=' + platform); toast('Enquiry link copied.'); } catch { toast('Could not copy. Use /enquire?source=' + platform, true); } }}>Copy {platform === 'facebook' ? 'Facebook' : 'TikTok'} enquiry link</button>)}</div>
    <div className="field-row">
      <label className="field">Search leads<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, phone, or enquiry" /></label>
      <label className="field">Platform<select value={source} onChange={e => setSource(e.target.value)}>{['All platforms', 'Facebook', 'TikTok'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="field">Status<select value={status} onChange={e => setStatus(e.target.value)}>{['All statuses', ...leadStatuses].map(v => <option key={v}>{v}</option>)}</select></label>
    </div>
    {!filtered.length && <p>No leads match these filters. Share an enquiry link or add a conversation to get started.</p>}
    {filtered.map(l => <button key={l.id} className="overview-order" onClick={() => setSelected(l.id)}><span><strong>{l.name}</strong><small>{l.source} · {l.phone} · {new Date(l.createdAt).toLocaleDateString()}</small></span><span>{l.status}{l.orderId && <small>{l.orderId}</small>}</span></button>)}
    {adding && <Sheet title="Add a social lead" onClose={() => setAdding(false)}><LeadForm admin onSaved={() => { setAdding(false); void refresh(); }} /></Sheet>}
    {lead && <Sheet title={lead.name + ' · ' + lead.source} onClose={() => setSelected(null)}><LeadEditor key={lead.id + lead.updatedAt} lead={lead} products={products} refresh={refresh} onOrder={id => { setSelected(null); onOrder(id); }} /></Sheet>}
  </section>;
}
function LeadEditor({ lead, products, refresh, onOrder }: { lead: Lead; products: Product[]; refresh: () => Promise<void>; onOrder: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [productId, setProductId] = useState(products.find(p => p.visible)?.id || '');
  const product = products.find(p => p.id === productId);
  return <div className="admin-filter-sheet"><p>{lead.message}</p><a href={'tel:' + lead.phone}>{lead.phone}</a>
    {lead.orderId ? <><p>Converted to {lead.orderId}. Manage fulfilment in Orders.</p><button className="primary" onClick={() => onOrder(lead.orderId!)}>View order</button></> : <>
      <form className="social-form" onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); try { await api('admin/leads/' + lead.id, { method: 'PATCH', body: JSON.stringify({ status: data.get('status'), notes: data.get('notes') }) }); await refresh(); toast('Follow-up saved.'); } catch (error) { toast((error as Error).message, true); } finally { setBusy(false); } }}>
        <label className="field">Follow-up status<select name="status" defaultValue={lead.status}>{leadStatuses.filter(s => s !== 'Converted').map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="field">Private notes<textarea name="notes" defaultValue={lead.notes} maxLength={3000} rows={3} /></label>
        <button className="secondary" disabled={busy}>Save follow-up</button>
      </form>
      <h3>Create a confirmed order</h3><p>Confirm the customer’s address and items first. Cash on delivery; stock and prices are checked when saved.</p>
      <form className="social-form" onSubmit={async e => {
        e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true);
        try {
          const result = await api<{ orderId: string }>('admin/leads/' + lead.id + '/order', { method: 'POST', body: JSON.stringify({ name: data.get('name'), phone: data.get('phone'), address: data.get('address'), zone: data.get('zone'), payment: 'COD', paymentReference: '', idempotencyKey: lead.id, items: [{ productId, size: data.get('size'), quantity: Number(data.get('quantity')), notes: data.get('notes') }] }) });
          await refresh(); toast('Order created: ' + result.orderId); onOrder(result.orderId);
        } catch (error) { toast((error as Error).message, true); } finally { setBusy(false); }
      }}>
        <label className="field">Customer name<input name="name" defaultValue={lead.name} required minLength={2} maxLength={80} /></label>
        <label className="field">Phone<input name="phone" type="tel" defaultValue={lead.phone} required maxLength={20} /></label>
        <label className="field">Delivery address<textarea name="address" required minLength={10} maxLength={400} /></label>
        <label className="field">Delivery zone<select name="zone"><option>Inside Dhaka</option><option>Outside Dhaka</option></select></label>
        <label className="field">Piece<select required value={productId} onChange={e => setProductId(e.target.value)}><option value="" disabled>Select a piece</option>{products.filter(p => p.visible).map(p => <option key={p.id} value={p.id}>{p.title} · {money(p.price)}</option>)}</select></label>
        <label className="field">Size<select name="size">{sizes.map(s => <option key={s} value={s}>{s} · {product?.stock[s] || 0} available</option>)}</select></label>
        <label className="field">Quantity<input name="quantity" type="number" min={1} max={10} defaultValue={1} required /></label>
        <label className="field">Order notes<textarea name="notes" maxLength={300} /></label>
        <button className="primary" disabled={busy || !product || lead.status === 'Lost'}>{busy ? 'Saving…' : 'Create COD order'}</button>
        {lead.status === 'Lost' && <p>Save an active follow-up status to reopen this lead first.</p>}
      </form>
    </>}
  </div>;
}
