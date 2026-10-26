'use client';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <TriangleAlert size={40} />
      <h1>A little snag in the thread.</h1>
      <p>We couldn’t load this page. Your bag is saved on this device.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
      <Link href="/">Back to the shop</Link>
    </main>
  );
}
