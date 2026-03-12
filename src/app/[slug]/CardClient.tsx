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
  reviewLink: string | null;
}

export default function CardClient({ rep, company }: { rep: RepData; company: CompanyData | null }) {
  const [shareFeedback, setShareFeedback] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [tapped, setTapped] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [showMapsModal, setShowMapsModal] = useState(false);

  // Trigger entrance animations after mount, then clean up transforms
  const [animDone, setAnimDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    // After all staggered animations finish, mark done so no residual transitions remain
    const t2 = setTimeout(() => setAnimDone(true), 1200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

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

  // Tap flash helper — sets tapped key, clears after 200ms
  function flash(key: string) {
    setTapped(key);
    setTimeout(() => setTapped(null), 200);
  }

  // Collect all social links
  const socials: { type: string; url: string; label: string }[] = [];

  // Company socials
  if (company?.companyInstagram) socials.push({ type: 'instagram', url: company.companyInstagram, label: 'Instagram' });
  if (company?.companyFacebook) socials.push({ type: 'facebook', url: company.companyFacebook, label: 'Facebook' });
  if (company?.companyLinkedIn) socials.push({ type: 'linkedin', url: company.companyLinkedIn, label: 'LinkedIn' });
  if (company?.companyTikTok) socials.push({ type: 'tiktok', url: company.companyTikTok, label: 'TikTok' });

  // Rep personal socials (avoid duplicates by type)
  const companyTypes = new Set(socials.map(s => s.type));
  if (rep.personalInstagram && !companyTypes.has('instagram')) socials.push({ type: 'instagram', url: rep.personalInstagram, label: 'Instagram' });
  if (rep.personalLinkedIn && !companyTypes.has('linkedin')) socials.push({ type: 'linkedin', url: rep.personalLinkedIn, label: 'LinkedIn' });
  if (rep.personalFacebook && !companyTypes.has('facebook')) socials.push({ type: 'facebook', url: rep.personalFacebook, label: 'Facebook' });
  if (rep.personalTikTok && !companyTypes.has('tiktok')) socials.push({ type: 'tiktok', url: rep.personalTikTok, label: 'TikTok' });
  if (rep.personalWebsite) socials.push({ type: 'website', url: rep.personalWebsite, label: 'Website' });

  // Animation stagger: each section gets an increasing delay
  const hasPhone = rep.phone || company?.companyPhone;
  let sectionIndex = 0;
  const heroIdx = sectionIndex++;
  const nameIdx = sectionIndex++;
  const quoteIdx = rep.bio ? sectionIndex++ : -1;
  const phoneIdx = hasPhone ? sectionIndex++ : -1;
  const emailIdx = rep.email ? sectionIndex++ : -1;
  const addressIdx = company?.companyAddress ? sectionIndex++ : -1;
  const websiteIdx = company?.companyWebsite ? sectionIndex++ : -1;
  const reviewIdx = sectionIndex++;
  const socialsIdx = socials.length > 0 ? sectionIndex++ : -1;
  const buttonsIdx = sectionIndex++;
  const footerIdx = sectionIndex++;

  function sectionStyle(idx: number) {
    const delay = idx * 80; // 80ms stagger
    if (animDone) return {};
    if (loaded) return {
      opacity: 1,
      transform: 'none',
      transition: `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`,
    };
    return {
      opacity: 0,
      transform: 'translateY(20px)',
      transition: `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`,
    };
  }

  // Tap style helper — only applies transform when actively tapped (no persistent transforms)
  function tapStyle(key: string): React.CSSProperties {
    if (tapped !== key) return {};
    return {
      transform: 'scale(0.96)',
      backgroundColor: 'rgba(0, 174, 239, 0.08)',
    };
  }

  return (
    <div className="bg-card-bg flex flex-col items-center font-sans" style={{ minHeight: '100dvh', overflowX: 'hidden' }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        html, body { overflow-x: hidden; width: 100%; }
      `}</style>
      <div className="w-full max-w-md mx-auto">

        {/* ─── 1. HERO PHOTO ─── */}
        <div className="relative w-full overflow-hidden" style={{ ...sectionStyle(heroIdx), minHeight: 'calc(40vh + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {rep.profilePhoto && rep.profilePhoto.trim() !== '' && !photoError ? (
            <img
              src={rep.profilePhoto}
              alt={`${rep.firstName} ${rep.lastName}`}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setPhotoError(true)}
            />
          ) : (
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(to bottom, #1a1a1a, #111111)' }}
            >
              <span className="text-7xl font-outfit font-bold text-spoton-blue">
                {rep.firstName[0]}{rep.lastName[0]}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, #111111 100%)' }}
          />

        </div>

        {/* ─── 2. NAME BLOCK ─── */}
        <div className="px-6 -mt-10 relative z-10 flex items-start justify-between gap-3" style={sectionStyle(nameIdx)}>
          <div>
            <h1 className="font-outfit uppercase tracking-[0.2em]">
              <span className="block text-3xl font-light text-white" style={{ lineHeight: '0.95' }}>
                {rep.firstName}
              </span>
              <span className="block text-4xl font-extrabold text-white" style={{ lineHeight: '0.95' }}>
                {rep.lastName}
              </span>
            </h1>
            {rep.jobTitle && (
              <p className="text-spoton-blue text-xs uppercase tracking-[0.15em] font-outfit font-semibold mt-1">
                {rep.jobTitle}
              </p>
            )}
          </div>
        </div>

        {/* ─── 3. DIVIDER + QUOTE ─── */}
        {rep.bio && (
          <div className="px-6 mt-3" style={quoteIdx >= 0 ? sectionStyle(quoteIdx) : undefined}>
            <div
              className="h-px w-full mb-2"
              style={{ background: 'linear-gradient(to right, transparent, #00AEEF, transparent)' }}
            />
            <p className="text-zinc-400 text-sm italic leading-relaxed">
              &ldquo;{rep.bio}&rdquo;
            </p>
          </div>
        )}

        {/* ─── 4. CONTACT ROWS ─── */}
        <div className="px-6 mt-3 space-y-1">

          {/* Phone row (compound: Mobile + Office) */}
          {hasPhone && (
            <div
              className="flex items-start gap-3 py-1.5 rounded-xl"
              style={{ ...sectionStyle(phoneIdx), ...tapStyle('phone') }}
            >
              <div className="w-10 h-10 rounded-lg bg-spoton-blue/10 border border-spoton-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-spoton-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                {rep.phone && (
                  <a
                    href={`tel:${rep.phone}`}
                    className="block text-sm"
                    onClick={() => flash('phone-mobile')}
                    style={tapStyle('phone-mobile')}
                  >
                    <span className="text-zinc-500 text-xs uppercase tracking-wider block">Mobile</span>
                    <span className="text-white block">{rep.phone}</span>
                  </a>
                )}
                {company?.companyPhone && (
                  <a
                    href={`tel:${company.companyPhone}`}
                    className="block text-sm"
                    onClick={() => flash('phone-office')}
                    style={tapStyle('phone-office')}
                  >
                    <span className="text-zinc-500 text-xs uppercase tracking-wider block">Office</span>
                    <span className="text-white block">{company.companyPhone}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Email row */}
          {rep.email && (
            <a
              href={`mailto:${rep.email}`}
              className="flex items-center gap-3 py-1.5 rounded-xl block"
              onClick={() => flash('email')}
              style={{ ...sectionStyle(emailIdx), ...tapStyle('email') }}
            >
              <div className="w-10 h-10 rounded-lg bg-spoton-blue/10 border border-spoton-blue/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-spoton-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-zinc-500 text-xs uppercase tracking-wider block">Email</span>
                <span className="text-white text-sm block truncate">{rep.email}</span>
              </div>
            </a>
          )}

          {/* Address row */}
          {company?.companyAddress && (
            <button
              className="flex items-center gap-3 py-1.5 rounded-xl w-full text-left"
              onClick={() => { flash('address'); setShowMapsModal(true); }}
              style={{ ...sectionStyle(addressIdx), ...tapStyle('address') }}
            >
              <div className="w-10 h-10 rounded-lg bg-spoton-blue/10 border border-spoton-blue/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-spoton-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-zinc-500 text-xs uppercase tracking-wider block">Office</span>
                <span className="text-white text-sm block">{company.companyAddress}</span>
              </div>
            </button>
          )}

          {/* Website row */}
          {company?.companyWebsite && (
            <a
              href={company.companyWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 py-1.5 rounded-xl block"
              onClick={() => flash('website')}
              style={{ ...sectionStyle(websiteIdx), ...tapStyle('website') }}
            >
              <div className="w-10 h-10 rounded-lg bg-spoton-blue/10 border border-spoton-blue/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-spoton-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-zinc-500 text-xs uppercase tracking-wider block">Website</span>
                <span className="text-white text-sm block">{company.companyWebsite.replace(/^https?:\/\//, '')}</span>
              </div>
            </a>
          )}

          {/* Leave a Review row */}
          <a
            href={company?.reviewLink || 'https://review.spotonroofing.com/'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-1.5 rounded-xl"
            onClick={() => flash('review')}
            style={{ ...sectionStyle(reviewIdx), ...tapStyle('review') }}
          >
            <div className="w-10 h-10 rounded-lg bg-spoton-blue/10 border border-spoton-blue/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-spoton-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-zinc-500 text-xs uppercase tracking-wider block">Feedback</span>
              <span className="text-white text-sm block">Leave a Review</span>
            </div>
          </a>

        </div>

        {/* ─── 5. SOCIAL ICONS ─── */}
        {socials.length > 0 && (
          <div
            className="flex justify-center gap-3 px-6 mt-3"
            style={socialsIdx >= 0 ? sectionStyle(socialsIdx) : undefined}
          >
            {socials.map((social, i) => (
              <a
                key={i}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white"
                title={social.label}
                onClick={() => flash(`social-${i}`)}
                style={tapStyle(`social-${i}`)}
              >
                <SocialIcon type={social.type} />
              </a>
            ))}
          </div>
        )}

        {/* ─── 6. SAVE CONTACT & SHARE CARD ─── */}
        <div className="px-6 mt-3 grid grid-cols-2 gap-3" style={sectionStyle(buttonsIdx)}>
          <button
            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-white/10 border border-white/20 text-zinc-200 text-sm font-medium"
            onClick={() => { flash('save'); handleSaveContact(); }}
            style={tapStyle('save')}
          >
            <svg className="w-4 h-4 text-zinc-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Save Contact
          </button>
          <button
            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-white/10 border border-white/20 text-zinc-200 text-sm font-medium"
            onClick={async () => {
              flash('share');
              const url = window.location.href;
              const title = `${rep.firstName} ${rep.lastName}`;
              if (navigator.share) {
                try { await navigator.share({ title, url }); } catch {}
              } else {
                await navigator.clipboard.writeText(url);
                setShareFeedback('Copied!');
                setTimeout(() => setShareFeedback(''), 2000);
              }
            }}
            style={tapStyle('share')}
          >
            <svg className="w-4 h-4 text-zinc-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {shareFeedback || 'Share Card'}
          </button>
        </div>

        {/* ─── 7. FOOTER ─── */}
        <div className="text-center py-4" style={sectionStyle(footerIdx)}>
          <a href="/login" className="text-xs text-zinc-600">
            Edit your card
          </a>
        </div>

      </div>

      {/* Maps picker modal */}
      {showMapsModal && company?.companyAddress && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          onClick={() => setShowMapsModal(false)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-xs space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-sm font-semibold text-center">Open in Maps</p>
            <a
              href={`https://maps.apple.com/?address=${encodeURIComponent(company.companyAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 rounded-xl text-white text-sm font-medium text-center"
              style={{ background: 'linear-gradient(135deg, #00AEEF, #0088CC)' }}
              onClick={() => setShowMapsModal(false)}
            >
              Apple Maps
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.companyAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 rounded-xl border border-zinc-600 text-white text-sm font-medium text-center"
              onClick={() => setShowMapsModal(false)}
            >
              Google Maps
            </a>
            <button
              onClick={() => setShowMapsModal(false)}
              className="block w-full py-2 text-zinc-500 text-xs text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
