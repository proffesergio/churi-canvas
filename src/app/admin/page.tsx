export const metadata = { robots: { index: false, follow: false } };
import { getSession } from '@/lib/auth';
import { Admin, AdminLogin } from '@/components/admin';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const session = await getSession();
  return session?.role === 'admin' ? <Admin /> : <AdminLogin />;
}
