'use client';

import { useEffect, useState } from 'react';

interface RepData {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  jobTitle: string;
  phone: string;
  email: string;
  profilePhoto: string | null;
  bio: string | null;
  personalInstagram: string | null;
  personalLinkedIn: string | null;
  personalFacebook: string | null;
  personalTikTok: string | null;
  personalWebsite: string | null;
}

interface CompanyData {
  companyName: string;
  companyAddress: string;
  companyPhone: string | null;
  companyWebsite: string;
  companyInstagram: string | null;
  companyFacebook: string | null;
  companyLinkedIn: string | null;
  companyTikTok: string | null;
  companyYouTube: string | null;
}

export default function CardClient({ rep, company }: { rep: RepData; company: CompanyData | null }) {
  const [shareFeedback, setShareFeedback] = useState('');

  // Log card_view on mount
  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repId: rep.id, eventType: 'card_view' }),
    }).catch(() => {});
  }, [rep.id]);

  function handleSaveContact() {
    // Log contact_tap
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repId: rep.id, eventType: 'contact_tap' }),
    }).catch(() => {});

    // Trigger vCard download
    window.location.href = `/api/vcard/${rep.slug}`;
  }

  const mapsUrl = company?.companyAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(company.companyAddress)}`
    : null;

  // Collect all social links
  const socials: { type: string; url: string; label: string }[] = [];

  // Company socials
  if (company?.companyInstagram) socials.push({ type: 'instagram', url: company.companyInstagram, label: 'Instagram' });
  if (company?.companyFacebook) socials.push({ type: 'facebook', url: company.companyFacebook, label: 'Facebook' });
  if (company?.companyLinkedIn) socials.push({ type: 'linkedin', url: company.companyLinkedIn, label: 'LinkedIn' });
  if (company?.companyTikTok) socials.push({ type: 'tiktok', url: company.companyTikTok, label: 'TikTok' });
  if (company?.companyYouTube) socials.push({ type: 'youtube', url: company.companyYouTube, label: 'YouTube' });

  // Rep personal socials (avoid duplicates by type)
  const companyTypes = new Set(socials.map(s => s.type));
  if (rep.personalInstagram && !companyTypes.has('instagram')) socials.push({ type: 'instagram', url: rep.personalInstagram, label: 'Instagram' });
  if (rep.personalLinkedIn && !companyTypes.has('linkedin')) socials.push({ type: 'linkedin', url: rep.personalLinkedIn, label: 'LinkedIn' });
  if (rep.personalFacebook && !companyTypes.has('facebook')) socials.push({ type: 'facebook', url: rep.personalFacebook, label: 'Facebook' });
  if (rep.personalTikTok && !companyTypes.has('tiktok')) socials.push({ type: 'tiktok', url: rep.personalTikTok, label: 'TikTok' });
  if (rep.personalWebsite) socials.push({ type: 'website', url: rep.personalWebsite, label: 'Website' });

  return (
    <div className="min-h-screen bg-black flex flex-col items-center">
      <div className="w-full max-w-md mx-auto px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/images/logo-white.png"
            alt="SpotOnRoof"
            className="mx-auto h-auto"
            style={{ maxWidth: '200px' }}
          />
        </div>

        {/* Profile Photo */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-white/20 bg-zinc-800">
              {rep.profilePhoto ? (
                <img
                  src={rep.profilePhoto}
                  alt={`${rep.firstName} ${rep.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-500">
                  {rep.firstName[0]}{rep.lastName[0]}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Name & Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            {rep.firstName} {rep.lastName}
          </h1>
          {rep.jobTitle && (
            <p className="text-spoton-blue text-lg mt-1">{rep.jobTitle}</p>
          )}
        </div>

        {/* Save Contact Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleSaveContact}
            className="px-8 py-2.5 border-2 border-[#00AEEF] bg-transparent text-white font-bold rounded-full text-base hover:bg-[#00AEEF]/10 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Save Contact
          </button>
        </div>

        {/* Contact Info */}
        <div className="space-y-3 mb-8">
          {rep.phone && (
            <a href={`tel:${rep.phone}`} className="flex items-center gap-3 text-white hover:text-spoton-blue transition-colors p-3 bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span>{rep.phone}</span>
            </a>
          )}

          {rep.email && (
            <a href={`mailto:${rep.email}`} className="flex items-center gap-3 text-white hover:text-spoton-blue transition-colors p-3 bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="truncate">{rep.email}</span>
            </a>
          )}

          {company?.companyAddress && (
            <a href={mapsUrl!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white hover:text-spoton-blue transition-colors p-3 bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm">{company.companyAddress}</span>
            </a>
          )}

          {company?.companyWebsite && (
            <a href={company.companyWebsite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white hover:text-spoton-blue transition-colors p-3 bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <span>{company.companyWebsite.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>

        {/* Social Links */}
        {socials.length > 0 && (
          <div className="flex justify-center gap-4 mb-8">
            {socials.map((social, i) => (
              <a
                key={i}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-white hover:text-spoton-blue hover:border-spoton-blue transition-colors"
                title={social.label}
              >
                <SocialIcon type={social.type} />
              </a>
            ))}
          </div>
        )}

        {/* Share Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={async () => {
              const url = window.location.href;
              const title = `${rep.firstName} ${rep.lastName}`;
              if (navigator.share) {
                try {
                  await navigator.share({ title, url });
                } catch {
                  // User cancelled share
                }
              } else {
                await navigator.clipboard.writeText(url);
                setShareFeedback('Link copied!');
                setTimeout(() => setShareFeedback(''), 2000);
              }
            }}
            className="text-sm rounded-full border border-gray-600 text-gray-400 px-6 py-2 hover:border-gray-400 transition-colors"
          >
            {shareFeedback || 'Share my card'}
          </button>
        </div>

        {/* Bio */}
        {rep.bio && (
          <div className="mb-8 text-center">
            <p className="text-zinc-400 text-sm leading-relaxed">{rep.bio}</p>
          </div>
        )}

      </div>
    </div>
  );
}

function SocialIcon({ type }: { type: string }) {
  switch (type) {
    case 'instagram':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'website':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
        </svg>
      );
  }
}
