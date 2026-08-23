// Shared insurance claims contact shown on every field inspector card.
// Customers save this so they recognize the follow-up call after signing.
export const CLAIMS_CONTACT = {
  firstName: 'Devin',
  lastName: 'Bey',
  jobTitle: 'Insurance Claims Specialist',
  orgName: 'SpotOn Roofing',
  phone: '+13802521252',
  email: 'devin@spotonroof.com',
  photoPath: 'public/images/claims-contact.jpg',
};

export function showsClaimsContact(rep: { jobTitle: string; email: string }): boolean {
  return /field inspector/i.test(rep.jobTitle) && rep.email.toLowerCase() !== CLAIMS_CONTACT.email;
}
