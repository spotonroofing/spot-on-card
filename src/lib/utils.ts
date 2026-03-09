import { prisma } from './prisma';

export async function generateSlug(firstName: string, lastName: string): Promise<string> {
  const base = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.rep.findUnique({ where: { slug } });
    if (!existing) return slug;
    counter++;
    slug = `${base}-${counter}`;
  }
}

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const botPatterns = [
    /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
    /googlebot/i, /bingbot/i, /yandex/i, /baidu/i, /facebookexternalhit/i,
    /twitterbot/i, /linkedinbot/i, /whatsapp/i, /telegrambot/i,
    /preview/i, /fetch/i, /curl/i, /wget/i, /python/i,
  ];
  return botPatterns.some(pattern => pattern.test(userAgent));
}
