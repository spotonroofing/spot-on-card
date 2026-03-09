import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const cardUrl = `${baseUrl}/${slug}`;

    const pngBuffer = await QRCode.toBuffer(cardUrl, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#FFFFFF',
        light: '#00000000',
      },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${slug}-qr.png"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('QR code error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
