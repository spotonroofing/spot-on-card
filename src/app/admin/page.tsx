'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface RepWithStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  slug: string;
  jobTitle: string;
  phone: string;
  profilePhoto: string | null;
  bio: string | null;
  personalInstagram: string | null;
  personalLinkedIn: string | null;
  personalFacebook: string | null;
  personalTikTok: string | null;
  personalWebsite: string | null;
  role: string;
  isActive: boolean;
  cardViews: number;
  contactTaps: number;
}

interface CompanySettings {
  id: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string | null;
  companyWebsite: string;
  companyLogo: string | null;
  companyInstagram: string | null;
  companyFacebook: string | null;
  companyLinkedIn: string | null;
  companyTikTok: string | null;
  companyYouTube: string | null;
  inviteCode: string;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
}

interface AnalyticsData {
  totalViews: number;
  totalTaps: number;
  perRep: { id: string; firstName: string; lastName: string; slug: string; views: number; taps: number }[];
}

type Tab = 'reps' | 'settings' | 'analytics';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('reps');
  const [reps, setReps] = useState<RepWithStats[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [editingRep, setEditingRep] = useState<RepWithStats | null>(null);
  const [showAddRep, setShowAddRep] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if ((session?.user as any)?.role !== 'admin') {
        router.push('/edit');
      } else {
        loadData();
      }
    }
  }, [status, session, router]);

  async function loadData() {
    try {
      const [repsRes, companyRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/reps'),
        fetch('/api/company'),
        fetch(`/api/admin/analytics?range=${analyticsRange}`),
      ]);

      if (repsRes.ok) setReps(await repsRes.json());
      if (companyRes.ok) setCompany(await companyRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetch(`/api/admin/analytics?range=${analyticsRange}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setAnalytics(d));
    }
  }, [analyticsRange, status, session]);

  async function toggleRepActive(rep: RepWithStats) {
    const res = await fetch(`/api/admin/reps/${rep.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rep.isActive }),
    });
    if (res.ok) {
      setReps(prev => prev.map(r => r.id === rep.id ? { ...r, isActive: !r.isActive } : r));
    }
  }

  async function deleteRep(rep: RepWithStats) {
    if (!confirm(`Delete ${rep.firstName} ${rep.lastName}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/reps/${rep.id}`, { method: 'DELETE' });
    if (res.ok) {
      setReps(prev => prev.filter(r => r.id !== rep.id));
    }
  }

  async function toggleAdmin(rep: RepWithStats) {
    const newRole = rep.role === 'admin' ? 'rep' : 'admin';
    const res = await fetch(`/api/admin/reps/${rep.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setReps(prev => prev.map(r => r.id === rep.id ? { ...r, role: newRole } : r));
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/images/logo-white.png" alt="SpotOnRoof" className="h-auto" style={{ maxWidth: '200px' }} />
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/edit" className="text-sm text-spoton-blue hover:underline">My Card</a>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-lg w-fit">
          {(['reps', 'settings', 'analytics'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t === 'reps' ? 'Reps' : t === 'settings' ? 'Company Settings' : 'Analytics'}
            </button>
          ))}
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-green-900/30 border border-green-800 text-green-400 text-sm">
            {message}
          </div>
        )}

        {/* Reps Tab */}
        {tab === 'reps' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Sales Reps ({reps.length})</h2>
              <button
                onClick={() => { setShowAddRep(true); setEditingRep(null); }}
                className="px-4 py-2 bg-gradient-to-r from-[#00AEEF] to-[#0077A8] text-white text-sm font-semibold rounded-lg hover:opacity-90"
              >
                + Add New Rep
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-center">Views</th>
                      <th className="px-4 py-3 text-center">Taps</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reps.map((rep) => (
                      <tr key={rep.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 text-white font-medium">
                          {rep.firstName} {rep.lastName}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{rep.email}</td>
                        <td className="px-4 py-3">
                          <a href={`/${rep.slug}`} target="_blank" className="text-spoton-blue hover:underline">
                            /{rep.slug}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            rep.role === 'admin' ? 'bg-spoton-blue/20 text-spoton-blue' : 'bg-zinc-700 text-zinc-400'
                          }`}>
                            {rep.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-zinc-300">{rep.cardViews}</td>
                        <td className="px-4 py-3 text-center text-zinc-300">{rep.contactTaps}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            rep.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                          }`}>
                            {rep.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setEditingRep(rep); setShowAddRep(false); }}
                              className="text-xs text-spoton-blue hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleRepActive(rep)}
                              className="text-xs text-zinc-400 hover:text-white"
                            >
                              {rep.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => toggleAdmin(rep)}
                              className="text-xs text-zinc-400 hover:text-white"
                            >
                              {rep.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => deleteRep(rep)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit/Add Rep Modal */}
            {(editingRep || showAddRep) && (
              <RepForm
                rep={editingRep}
                onClose={() => { setEditingRep(null); setShowAddRep(false); }}
                onSaved={(msg) => {
                  setMessage(msg);
                  setTimeout(() => setMessage(''), 3000);
                  setEditingRep(null);
                  setShowAddRep(false);
                  loadData();
                }}
              />
            )}
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && company && (
          <SettingsForm
            settings={company}
            onSaved={(msg) => {
              setMessage(msg);
              setTimeout(() => setMessage(''), 3000);
              loadData();
            }}
          />
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Analytics Overview</h2>
              <select
                value={analyticsRange}
                onChange={(e) => setAnalyticsRange(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            {analytics && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                    <p className="text-4xl font-bold text-white">{analytics.totalViews}</p>
                    <p className="text-sm text-zinc-400 mt-1">Total Card Views</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                    <p className="text-4xl font-bold text-white">{analytics.totalTaps}</p>
                    <p className="text-sm text-zinc-400 mt-1">Total Contact Taps</p>
                  </div>
                </div>

                {analytics.perRep.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <h3 className="text-sm font-semibold text-zinc-400 px-4 py-3 border-b border-zinc-800">
                      Per-Rep Breakdown
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                          <th className="px-4 py-2">Rep</th>
                          <th className="px-4 py-2 text-center">Views</th>
                          <th className="px-4 py-2 text-center">Taps</th>
                          <th className="px-4 py-2 text-center">Conversion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.perRep.map((r) => (
                          <tr key={r.id} className="border-b border-zinc-800/50">
                            <td className="px-4 py-2 text-white">{r.firstName} {r.lastName}</td>
                            <td className="px-4 py-2 text-center text-zinc-300">{r.views}</td>
                            <td className="px-4 py-2 text-center text-zinc-300">{r.taps}</td>
                            <td className="px-4 py-2 text-center text-zinc-400">
                              {r.views > 0 ? `${((r.taps / r.views) * 100).toFixed(1)}%` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Rep Edit/Create Form ---
function RepForm({
  rep,
  onClose,
  onSaved,
}: {
  rep: RepWithStats | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: rep?.firstName || '',
    lastName: rep?.lastName || '',
    email: rep?.email || '',
    jobTitle: rep?.jobTitle || '',
    phone: rep?.phone || '',
    bio: rep?.bio || '',
    profilePhoto: rep?.profilePhoto || '',
    personalInstagram: rep?.personalInstagram || '',
    personalLinkedIn: rep?.personalLinkedIn || '',
    personalFacebook: rep?.personalFacebook || '',
    personalTikTok: rep?.personalTikTok || '',
    personalWebsite: rep?.personalWebsite || '',
  });

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setForm(prev => ({ ...prev, profilePhoto: data.url }));
    } catch {
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = rep ? `/api/admin/reps/${rep.id}` : '/api/admin/reps';
      const method = rep ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        onSaved(rep ? 'Rep updated successfully!' : 'Rep created successfully!');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center pt-12 px-4 z-50 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">
            {rep ? `Edit ${rep.firstName} ${rep.lastName}` : 'Add New Rep'}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {form.profilePhoto ? (
                <img src={form.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg text-zinc-500">{form.firstName?.[0]}{form.lastName?.[0]}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-spoton-blue hover:underline disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload photo'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">First Name *</label>
              <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-spoton-blue" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Last Name *</label>
              <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-spoton-blue" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-spoton-blue" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Job Title</label>
            <input type="text" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-spoton-blue" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-spoton-blue" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Bio ({(form.bio || '').length}/200)</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 200) })} rows={2} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-spoton-blue resize-none" />
          </div>

          <details className="group">
            <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">Social Links</summary>
            <div className="mt-3 space-y-2">
              {[
                { key: 'personalInstagram', label: 'Instagram' },
                { key: 'personalLinkedIn', label: 'LinkedIn' },
                { key: 'personalFacebook', label: 'Facebook' },
                { key: 'personalTikTok', label: 'TikTok' },
                { key: 'personalWebsite', label: 'Website' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                  <input type="url" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-spoton-blue" />
                </div>
              ))}
            </div>
          </details>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-[#00AEEF] to-[#0077A8] text-white font-semibold rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving...' : (rep ? 'Update Rep' : 'Create Rep')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Company Settings Form ---
function SettingsForm({
  settings,
  onSaved,
}: {
  settings: CompanySettings;
  onSaved: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...settings });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) onSaved('Settings updated!');
    } catch {
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-spoton-blue";

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <h2 className="text-lg font-bold text-white mb-2">Company Settings</h2>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Company Name</label>
        <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={inputClass} />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Address</label>
        <input type="text" value={form.companyAddress} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Phone</label>
          <input type="text" value={form.companyPhone || ''} onChange={(e) => setForm({ ...form, companyPhone: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Website</label>
          <input type="url" value={form.companyWebsite} onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })} className={inputClass} />
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Social Links</h3>
        <div className="space-y-3">
          {[
            { key: 'companyInstagram', label: 'Instagram' },
            { key: 'companyFacebook', label: 'Facebook' },
            { key: 'companyLinkedIn', label: 'LinkedIn' },
            { key: 'companyTikTok', label: 'TikTok' },
            { key: 'companyYouTube', label: 'YouTube' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-zinc-500 mb-1">{label}</label>
              <input type="url" value={(form as any)[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputClass} />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Security & Brand</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Invite Code</label>
            <input type="text" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value })} className={inputClass} />
            <p className="text-xs text-zinc-600 mt-1">Reps use this code to self-register</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Primary Color</label>
              <input type="text" value={form.brandPrimaryColor} onChange={(e) => setForm({ ...form, brandPrimaryColor: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Secondary Color</label>
              <input type="text" value={form.brandSecondaryColor} onChange={(e) => setForm({ ...form, brandSecondaryColor: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      <button type="submit" disabled={saving} className="w-full py-2.5 bg-gradient-to-r from-[#00AEEF] to-[#0077A8] text-white font-semibold rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}
