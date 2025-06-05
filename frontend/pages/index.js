import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Welcome to the Care Tracker App</h1>
      <p>This is your new congregational care tracking system.</p>
      <Link href="/intake">
        <button style={{ marginTop: 20, padding: '10px 20px', fontSize: 16 }}>
          Go to Intake Form
        </button>
      </Link>
    </div>
  );
} 