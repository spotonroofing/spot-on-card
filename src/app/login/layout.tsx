import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | SpotOn Card',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
