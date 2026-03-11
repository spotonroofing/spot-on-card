import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import CardClient from './CardClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const rep = await prisma.rep.findUnique({ where: { slug } });

    if (!rep) {
      return { title: 'Not Found | SpotOn Card' };
    }

    return {
      title: `${rep.firstName} ${rep.lastName} | SpotOnRoof`,
      description: `${rep.firstName} ${rep.lastName}, ${rep.jobTitle || 'Sales Representative'} at SpotOnRoof. Save my contact info.`,
      openGraph: {
        title: `${rep.firstName} ${rep.lastName} | SpotOnRoof`,
        description: `${rep.jobTitle || 'Sales Representative'} at SpotOnRoof`,
        type: 'profile',
        ...(rep.profilePhoto && {
          images: [{ url: rep.profilePhoto, width: 500, height: 500 }],
        }),
      },
    };
  } catch {
    return { title: 'SpotOn Card' };
  }
}

export default async function CardPage({ params }: Props) {
  const { slug } = await params;

  let rep;
  try {
    rep = await prisma.rep.findUnique({ where: { slug } });
  } catch {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <img src="/images/logo-white.png" alt="SpotOnRoof" className="mx-auto mb-4 h-auto" style={{ maxWidth: '200px' }} />
          <p className="text-zinc-400 text-lg">Service temporarily unavailable. Please try again later.</p>
          <a href="https://spotonroof.com" className="text-spoton-blue hover:underline mt-4 inline-block">
            Visit spotonroof.com
          </a>
        </div>
      </div>
    );
  }

  if (!rep) {
    notFound();
  }

  if (!rep.isActive) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <img src="/images/logo-white.png" alt="SpotOnRoof" className="mx-auto mb-4 h-auto" style={{ maxWidth: '200px' }} />
          <p className="text-zinc-400 text-lg">This card is no longer active.</p>
          <a href="https://spotonroof.com" className="text-spoton-blue hover:underline mt-4 inline-block">
            Visit spotonroof.com
          </a>
        </div>
      </div>
    );
  }

  let company = null;
  try {
    company = await prisma.companySettings.findFirst();
  } catch {
    // Continue without company data
  }

  return (
    <CardClient
      rep={{
        id: rep.id,
        firstName: rep.firstName,
        lastName: rep.lastName,
        slug: rep.slug,
        jobTitle: rep.jobTitle,
        phone: rep.phone,
        email: rep.email,
        profilePhoto: rep.profilePhoto,
        bio: rep.bio,
        personalInstagram: rep.personalInstagram,
        personalLinkedIn: rep.personalLinkedIn,
        personalFacebook: rep.personalFacebook,
        personalTikTok: rep.personalTikTok,
        personalWebsite: rep.personalWebsite,
      }}
      company={company ? {
        companyName: company.companyName,
        companyAddress: company.companyAddress,
        companyPhone: company.companyPhone,
        companyWebsite: company.companyWebsite,
        companyInstagram: company.companyInstagram,
        companyFacebook: company.companyFacebook,
        companyLinkedIn: company.companyLinkedIn,
        companyTikTok: company.companyTikTok,
        companyYouTube: company.companyYouTube,
      } : null}
    />
  );
}
