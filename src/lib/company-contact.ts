/**
 * The company's public contact details: the one source for the footer, the
 * contact page, the homepage Organization schema and llms.txt.
 */
export const COMPANY_CONTACT = {
  name: "Ormani po meri, Beograd",
  phone: "062 351 598",
  phoneIntl: "+38162351598",
  email: "info@ormanipomeri.com",
  hours: "10–19h",
} as const;

export const COMPANY_PHONE_HREF = `tel:${COMPANY_CONTACT.phoneIntl}`;
