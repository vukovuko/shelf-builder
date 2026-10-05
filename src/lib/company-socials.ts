import type { SocialLink } from "@/components/SocialIcons";

/**
 * The company's own profiles: the one list behind the footer icons and the
 * homepage Organization schema (sameAs). Only business accounts go here;
 * blog posts link the author's personal profiles from lib/blog-data.
 */
export const COMPANY_SOCIALS = [
  {
    platform: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/ormani_po_meri_com/",
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    url: "https://www.linkedin.com/company/ormani-po-meri/",
  },
] satisfies SocialLink[];
