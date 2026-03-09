import { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      email: string;
      repId: string;
      role: Role;
      slug: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    repId?: string;
    role?: Role;
    slug?: string;
  }
}
