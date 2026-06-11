import Link from 'next/link';
import { apiVerifyEmail } from '@/lib/api';

interface Props {
  searchParams: { token?: string };
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div className="auth-error" style={{ marginBottom: '20px' }}>
          This verification link is missing a token. Please check your email for the correct link.
        </div>
        <Link href="/login" className="auth-link" style={{ fontSize: '0.82rem' }}>Back to sign in</Link>
      </div>
    );
  }

  let success = false;
  let message = '';

  try {
    const result = await apiVerifyEmail(token);
    success = result.ok;
    message = result.message || 'Email verified successfully.';
  } catch (err) {
    message = err instanceof Error ? err.message : 'Verification failed.';
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div className="auth-success" style={{ marginBottom: '24px' }}>
          {message} You can now sign in.
        </div>
        <Link href="/login" className="auth-submit" style={{ display: 'inline-block', textDecoration: 'none', padding: '12px 28px' }}>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div className="auth-error" style={{ marginBottom: '20px' }}>{message}</div>
      <Link href="/login" className="auth-link" style={{ fontSize: '0.82rem' }}>Back to sign in</Link>
    </div>
  );
}
