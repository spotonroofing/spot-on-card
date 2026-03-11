import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import { Resend } from 'resend';

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV !== 'production',
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
  providers: [
    EmailProvider({
      server: { host: '', port: 0, auth: { user: '', pass: '' } },
      from: process.env.RESEND_FROM_EMAIL || 'noreply@spotonroof.com',
      sendVerificationRequest: async ({ identifier: email, url }) => {
        try {
          await getResend().emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@spotonroof.com',
            to: email,
            subject: 'Sign in to SpotOnRoof',
            html: `
              <div style="background-color: #000; padding: 40px; font-family: Arial, sans-serif;">
                <div style="max-width: 400px; margin: 0 auto; text-align: center;">
                  <img src="https://spot-on-card-production.up.railway.app/images/logo-white.png" alt="SpotOnRoof" style="max-width: 180px; margin: 0 auto 8px;" />
                  <p style="color: #ccc; margin-bottom: 24px;">Click the button below to sign in to your digital business card.</p>
                  <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #00AEEF, #0077A8); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Sign In
                  </a>
                  <p style="color: #666; font-size: 12px; margin-top: 24px;">This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>
                </div>
              </div>
            `,
          });
        } catch (error) {
          console.error('Failed to send verification email:', error);
          throw new Error('Failed to send verification email');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allow same-origin URLs
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const rep = await prisma.rep.findUnique({
          where: { email: user.email },
        });
        if (rep) {
          token.repId = rep.id;
          token.role = rep.role;
          token.slug = rep.slug;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).repId = token.repId;
        (session.user as any).role = token.role;
        (session.user as any).slug = token.slug;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/login?sent=true',
  },
});
