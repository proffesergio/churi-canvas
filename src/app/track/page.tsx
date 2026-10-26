export const metadata = { robots: { index: false, follow: false } };
import { Tracking } from '@/components/tracking';
export default async function Track({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const { id, token } = await searchParams;
  return <Tracking key={id} id={id} token={token} />;
}
