'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    inviteCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Logo />
          <div className="mt-8 bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
            <div className="w-16 h-16 bg-teal-start/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Registration successful!</h2>
            <p className="text-zinc-400 mb-4">
              Your account has been created. Sign in with your email to set up your card.
            </p>
            <a
              href="/login"
              className="inline-block w-full py-3 bg-gradient-to-r from-teal-start to-teal-end text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-center"
            >
              Go to Sign In
            </a>
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
          <h2 className="text-xl font-bold text-white mb-2">Create your card</h2>
          <p className="text-zinc-400 mb-6">Register to get your SpotOnRoof digital business card</p>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 text-sm mb-1">First Name</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-spoton-blue"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-spoton-blue"
                />
              </div>
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@email.com"
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-spoton-blue"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Invite Code</label>
              <input
                type="text"
                value={form.inviteCode}
                onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
                placeholder="Enter your company invite code"
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-spoton-blue"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-teal-start to-teal-end text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Register'}
            </button>
          </form>

          <p className="text-zinc-500 text-sm mt-6">
            Already registered?{' '}
            <a href="/login" className="text-spoton-blue hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="text-3xl font-bold">
      <span className="text-white">Spot</span>
      <span className="text-spoton-blue">On</span>
      <span className="text-white">Roof</span>
    </div>
  );
}
