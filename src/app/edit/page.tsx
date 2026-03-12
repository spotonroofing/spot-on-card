'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PhotoCropModal from '@/components/PhotoCropModal';

interface RepData {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  email: string;
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
}

interface CompanyData {
  companyName: string;
  companyAddress: string;
  companyPhone: string | null;
  companyWebsite: string;
  companyLogo: string | null;
  companyInstagram: string | null;
  companyFacebook: string | null;
  companyLinkedIn: string | null;
  companyTikTok: string | null;
}

interface Analytics {
  cardViews: number;
  contactTaps: number;
}

export default function EditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rep, setRep] = useState<RepData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({ cardViews: 0, contactTaps: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    jobTitle: '',
    phone: '',
    email: '',
    bio: '',
    profilePhoto: '',
    personalInstagram: '',
    personalLinkedIn: '',
    personalFacebook: '',
    personalTikTok: '',
    personalWebsite: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
  }, [status]);

  async function loadData() {
    try {
      const [repRes, companyRes, analyticsRes] = await Promise.all([
        fetch('/api/reps'),
        fetch('/api/company'),
        fetch('/api/analytics/stats'),
      ]);

      if (repRes.ok) {
        const repData = await repRes.json();
        setRep(repData);
        setForm({
          firstName: repData.firstName || '',
          lastName: repData.lastName || '',
          jobTitle: repData.jobTitle || '',
          phone: repData.phone || '',
          email: repData.email || '',
          bio: repData.bio || '',
          profilePhoto: repData.profilePhoto || '',
          personalInstagram: repData.personalInstagram || '',
          personalLinkedIn: repData.personalLinkedIn || '',
          personalFacebook: repData.personalFacebook || '',
          personalTikTok: repData.personalTikTok || '',
          personalWebsite: repData.personalWebsite || '',
        });
      }

      if (companyRes.ok) {
        setCompany(await companyRes.json());
      }

      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    e.target.value = '';
  }

  async function handleCroppedUpload(croppedBlob: Blob) {
    setCropFile(null);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', croppedBlob, 'profile.jpg');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setForm(prev => ({ ...prev, profilePhoto: data.url }));
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/reps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const updated = await res.json();
        setRep(updated);
        setMessage('Profile saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save. Please try again.');
      }
    } catch {
      setMessage('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  function copyCardUrl() {
    if (!rep) return;
    const url = `${window.location.origin}/${rep.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Profile not found.</div>
      </div>
    );
  }

  const cardUrl = typeof window !== 'undefined' ? `${window.location.origin}/${rep.slug}` : `/${rep.slug}`;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <img src="/images/logo-white.png" alt="SpotOnRoof" className="h-auto" style={{ maxWidth: '200px' }} />
          <div className="flex items-center gap-4">
            {rep.role === 'admin' && (
              <a href="/admin" className="text-sm text-spoton-blue hover:underline">
                Admin
              </a>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Analytics Summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-white">{analytics.cardViews}</p>
            <p className="text-sm text-zinc-400 mt-1">Card Views</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-white">{analytics.contactTaps}</p>
            <p className="text-sm text-zinc-400 mt-1">Contact Taps</p>
          </div>
        </div>

        {/* Card URL + QR */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-8">
          <p className="text-sm text-zinc-400 mb-2">Your Card URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-zinc-800 px-3 py-2 rounded-lg text-spoton-blue text-sm truncate">
              {cardUrl}
            </code>
            <button
              onClick={copyCardUrl}
              className="px-3 py-2 bg-zinc-800 rounded-lg text-sm text-white hover:bg-zinc-700 transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={`/${rep.slug}`}
              target="_blank"
              className="px-3 py-2 bg-zinc-800 rounded-lg text-sm text-white hover:bg-zinc-700 transition-colors"
            >
              View
            </a>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <a
              href={`/api/qrcode/${rep.slug}`}
              download={`${rep.slug}-qr.png`}
              className="text-sm text-spoton-blue hover:underline"
            >
              Download QR Code
            </a>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <h2 className="text-lg font-bold text-white">Edit Your Card</h2>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Profile Photo</label>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {form.profilePhoto ? (
                  <img src={form.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-zinc-500">
                    {form.firstName?.[0]}{form.lastName?.[0]}
                  </span>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-sm text-spoton-blue hover:underline disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Change photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-spoton-blue"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-spoton-blue"
              />
            </div>
          </div>

          {/* Job Title */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Job Title</label>
            <input
              type="text"
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              placeholder="e.g. Sales Representative"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-spoton-blue"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-spoton-blue"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-spoton-blue"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Bio <span className="text-zinc-600">({form.bio.length}/200)</span>
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 200) })}
              placeholder="A short personal bio..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-spoton-blue resize-none"
            />
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">Personal Social Links</h3>
            <div className="space-y-3">
              {[
                { key: 'personalInstagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
                { key: 'personalLinkedIn', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourprofile' },
                { key: 'personalFacebook', label: 'Facebook', placeholder: 'https://facebook.com/yourprofile' },
                { key: 'personalTikTok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
                { key: 'personalWebsite', label: 'Website', placeholder: 'https://yourwebsite.com' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm text-zinc-500 mb-1">{label}</label>
                  <input
                    type="url"
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-spoton-blue"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          {message && (
            <p className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-[#00AEEF] to-[#0077A8] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Company Info (Read-only) */}
        {company && (
          <div className="mt-10 border-t border-zinc-800 pt-8">
            <h3 className="text-sm font-semibold text-zinc-400 mb-4">
              Company Info <span className="text-zinc-600">(set by admin)</span>
            </h3>
            <div className="space-y-2 text-sm text-zinc-500">
              <p><span className="text-zinc-400">Company:</span> {company.companyName}</p>
              <p><span className="text-zinc-400">Address:</span> {company.companyAddress}</p>
              <p><span className="text-zinc-400">Website:</span> {company.companyWebsite}</p>
              {company.companyPhone && (
                <p><span className="text-zinc-400">Phone:</span> {company.companyPhone}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {cropFile && (
        <PhotoCropModal
          imageFile={cropFile}
          onCropComplete={handleCroppedUpload}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
