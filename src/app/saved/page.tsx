export const metadata = { robots: { index: false, follow: false } };
import { Shop } from '@/components/shop';
export default function Saved() {
  return <Shop mode="saved" />;
}
