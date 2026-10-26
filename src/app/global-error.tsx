'use client';
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'Arial,sans-serif',
          padding: 40,
          textAlign: 'center',
          background: '#fffdf8',
          color: '#792b38',
        }}
      >
        <h1>A little snag in the thread.</h1>
        <p>We couldn’t open ChuriCanvas. Please try again.</p>
        <button
          onClick={reset}
          style={{ padding: '12px 24px', cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
