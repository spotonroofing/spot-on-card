interface VCardData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  jobTitle: string;
  orgName: string;
  address: string;
  website: string;
  photoBase64?: string;
}

export function generateVCard(data: VCardData): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${data.lastName};${data.firstName};;;`,
    `FN:${data.firstName} ${data.lastName}`,
    `ORG:${data.orgName}`,
    `TITLE:${data.jobTitle}`,
  ];

  if (data.phone) {
    const cleanPhone = data.phone.replace(/[^+\d]/g, '');
    lines.push(`TEL;TYPE=CELL:${cleanPhone}`);
  }

  if (data.email) {
    lines.push(`EMAIL:${data.email}`);
  }

  if (data.address) {
    // Parse address into structured format
    // "130 E Wilson Bridge Rd Suite 300, Worthington, OH 43085"
    const parts = data.address.split(',').map(s => s.trim());
    const street = parts[0] || '';
    const city = parts[1] || '';
    const stateZip = (parts[2] || '').trim().split(' ');
    const state = stateZip[0] || '';
    const zip = stateZip[1] || '';
    lines.push(`ADR;TYPE=WORK:;;${street};${city};${state};${zip};US`);
  }

  if (data.website) {
    lines.push(`URL:${data.website}`);
  }

  if (data.photoBase64) {
    lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${data.photoBase64}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}
