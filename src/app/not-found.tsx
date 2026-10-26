import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="error-page">
      <span className="eyebrow">404 · A missing piece</span>
      <h1>This page has wandered off.</h1>
      <Link className="primary" href="/">
        Explore the collection
      </Link>
    </main>
  );
}
