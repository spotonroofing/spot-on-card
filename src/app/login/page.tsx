'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const sent = searchParams.get('sent') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('email', {
        email,
        redirect: false,
        callbackUrl: '/edit',
      });

      if (result?.error) {
        setError('Failed to send magic link. Please try again.');
      } else {
        window.location.href = '/login?sent=true';
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Logo />
          <div className="mt-8 bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
            <div className="w-16 h-16 bg-teal-start/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-spoton-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-zinc-400">
              We sent a sign-in link to your email address. Click the link to log in.
            </p>
            <p className="text-zinc-500 text-sm mt-4">
              Didn&apos;t receive it?{' '}
              <button
                onClick={() => window.location.href = '/login'}
                className="text-spoton-blue hover:underline"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Logo />
        <div className="mt-8 bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
          <h2 className="text-xl font-bold text-white mb-2">Sign in</h2>
          <p className="text-zinc-400 mb-6">Enter your email to receive a magic link</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@spotonroof.com"
              required
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-spoton-blue focus:border-transparent"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#00AEEF] to-[#0077A8] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>

          <p className="text-zinc-500 text-sm mt-6">
            New rep?{' '}
            <a href="/register" className="text-spoton-blue hover:underline">
              Register here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <img src="/images/logo-white.png" alt="SpotOnRoof" style={{ maxWidth: 200 }} className="mx-auto" />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
