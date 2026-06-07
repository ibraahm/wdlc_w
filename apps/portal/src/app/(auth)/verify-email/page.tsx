import Link from 'next/link';
import { apiVerifyEmail } from '@/lib/api';

interface Props {
  searchParams: { token?: string };
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid link</h2>
        <p className="text-sm text-gray-600 mb-6">
          This verification link is missing a token. Please check your email for the correct link.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Back to sign in
        </Link>
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
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Email verified</h2>
        <p className="text-sm text-gray-600 mb-6">
          Email verified — you can now sign in.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification failed</h2>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <Link href="/login" className="text-sm font-medium text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
