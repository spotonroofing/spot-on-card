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

// Junior / regular / Senior Field Inspector. Everyone from Team Lead up is not one.
export function isFieldInspector(jobTitle: string): boolean {
  return /field inspector/i.test(jobTitle);
}

// Team Leaders also show the claims contact button. Matches "Team Lead" and "Team Leader".
export function isTeamLeader(jobTitle: string): boolean {
  return /team lead/i.test(jobTitle);
}

export function showsClaimsContact(rep: { jobTitle: string; email: string }): boolean {
  return (isFieldInspector(rep.jobTitle) || isTeamLeader(rep.jobTitle)) && rep.email.toLowerCase() !== CLAIMS_CONTACT.email;
}
