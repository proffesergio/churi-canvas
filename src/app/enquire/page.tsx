import { Shell } from '@/components/shell';
import { LeadForm } from '@/components/lead-form';
export const metadata = { title: 'Ask about a piece | ChuriCanvas' };
export default async function Enquire({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams;
  return <Shell><section className="login-card" style={{ margin: '48px auto', maxWidth: 560 }}><span className="eyebrow">LET’S MAKE IT YOURS</span><h1>Ask about a piece.</h1><p>Tell us what caught your eye. We’ll help with sizes, colours, and ordering.</p><LeadForm source={source?.toLowerCase() === 'tiktok' ? 'TikTok' : 'Facebook'} /></section></Shell>;
}
