import Link from 'next/link';

export default function ThankYou() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f6fa',
      flexDirection: 'column',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        padding: 40,
        textAlign: 'center',
        maxWidth: 400
      }}>
        <h2>Thank you!</h2>
        <p style={{ fontSize: 20, margin: '24px 0' }}>
          Your submission was received.<br />You'll receive a confirmation email with your case number shortly.
        </p>
        <Link href="/intake">
          <button style={{
            marginTop: 24,
            padding: '10px 24px',
            fontSize: 16,
            borderRadius: 6,
            border: '1px solid #1976d2',
            background: '#1976d2',
            color: '#fff',
            cursor: 'pointer'
          }}>
            Submit another
          </button>
        </Link>
      </div>
    </div>
  );
} 