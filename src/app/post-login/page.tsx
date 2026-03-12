import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function PostLoginPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as any).role;

  if (role === 'admin') {
    redirect('/admin');
  }

  redirect('/edit');
}
